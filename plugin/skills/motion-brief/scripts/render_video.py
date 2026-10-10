#!/usr/bin/env python3
"""Render a MotionBrief video to an MP4 file, with voice-over, captions and music.

Usage:
    python3 scripts/render_video.py --brief brief.json --plan plan.json --out out
        [--icons DIR] [--images DIR] [--music FILE]
        [--tts auto|edge|gtts|espeak|none] [--scale 1.0] [--stills-only]

Writes to --out:
    video.mp4      the video (H.264 + AAC)
    captions.srt   captions timed to the voice-over
    narration.txt  the narration with scene timestamps
    report.json    the self-check: fit, safe zone, overlap, contrast, timing, audio
    stills/        one frame per scene, after its entrance settles

Needs Pillow and numpy. ffmpeg comes from PATH or the imageio-ffmpeg package. Voice-over uses
edge-tts or gTTS (network) and falls back to espeak-ng (offline) or silence. Layout, text fit
and styles follow the MotionBrief website, so the video matches its preview rules.
"""

import argparse
import asyncio
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from collections import namedtuple
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
REFS = SKILL / "refs"
FONTS = SKILL / "assets" / "fonts"
sys.path.insert(0, str(HERE))
from brief_tool import brief_hash, brief_rules, validate  # noqa: E402

SR = 44100
VO_LEAD = 0.35  # seconds into a scene before narration starts
VO_TAIL = 0.5  # breathing room after narration
Rect = namedtuple("Rect", "x y w h")


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- easing


def cubic_bezier(x1, y1, x2, y2):
    """CSS cubic-bezier easing as a function of progress 0..1."""

    def coord(t, a, b):
        return 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t**3

    def ease(p):
        if p <= 0:
            return 0.0
        if p >= 1:
            return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if coord(mid, x1, x2) < p:
                lo = mid
            else:
                hi = mid
        return coord((lo + hi) / 2, y1, y2)

    return ease


EASE_OUT = cubic_bezier(0.25, 1, 0.5, 1)
EASE_IN = cubic_bezier(0.5, 0, 0.75, 0)


# ---------------------------------------------------------------- colour


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def luminance(h):
    def ch(c):
        s = c / 255
        return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = hex_rgb(h)
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


# ---------------------------------------------------------------- fonts


class FontBook:
    """Bundled Google Fonts by family and weight, falling back to DejaVu with a warning."""

    def __init__(self, warnings):
        self.manifest = load_json(FONTS / "fonts.json") if (FONTS / "fonts.json").exists() else {}
        self.cache = {}
        self.warnings = warnings

    def path(self, family, weight):
        files = self.manifest.get(family, {})
        name = files.get(str(weight)) or files.get("700" if weight >= 700 else "400") or next(iter(files.values()), None)
        if name and (FONTS / name).exists():
            return str(FONTS / name)
        for candidate in ("DejaVuSans-Bold.ttf" if weight >= 700 else "DejaVuSans.ttf", "DejaVuSans.ttf", "arial.ttf"):
            try:
                ImageFont.truetype(candidate, 12)
                msg = 'Font "%s" isn\'t bundled; used %s instead.' % (family, candidate)
                if msg not in self.warnings:
                    self.warnings.append(msg)
                return candidate
            except OSError:
                continue
        raise RuntimeError("No usable font for %s" % family)

    def get(self, family, weight, size):
        key = (family, weight, int(size))
        if key not in self.cache:
            self.cache[key] = ImageFont.truetype(self.path(family, weight), int(size))
        return self.cache[key]


# ---------------------------------------------------------------- text fit


def wrap(text, font, width):
    lines, too_wide = [], False
    for paragraph in text.split("\n"):
        line = ""
        for word in paragraph.split():
            if font.getlength(word) > width:
                too_wide = True
            candidate = (line + " " + word) if line else word
            if not line or font.getlength(candidate) <= width:
                line = candidate
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines, too_wide


def fit_text(text, box, family, weight, max_size, min_size, max_lines, fonts, line_height):
    """Shrink from max_size towards min_size until the text wraps into the box (site rules)."""
    min_size = max(1, int(min_size))
    size = max(min_size, int(max_size))
    while True:
        font = fonts.get(family, weight, size)
        lines, too_wide = wrap(text, font, box.w)
        too_many = len(lines) > max_lines
        too_tall = len(lines) * size * line_height > box.h
        if not too_wide and not too_many and not too_tall:
            return {"size": size, "lines": lines, "fits": True, "problem": None}
        if size <= min_size:
            problem = "word-too-wide" if too_wide else "too-many-lines" if too_many else "too-tall"
            return {"size": size, "lines": lines, "fits": False, "problem": problem}
        size = max(min_size, min(size - 1, int(size * 0.94)))


# ---------------------------------------------------------------- layout (mirrors apps/site sceneLayout.ts)


def stack(r, weights, gap):
    if not weights:
        return []
    total = sum(weights)
    free = max(0.0, r.h - gap * (len(weights) - 1))
    out, y = [], r.y
    for w in weights:
        h = free * w / total
        out.append(Rect(r.x, y, r.w, h))
        y += h + gap
    return out


def columns(r, weights, gap):
    if not weights:
        return []
    total = sum(weights)
    free = max(0.0, r.w - gap * (len(weights) - 1))
    out, x = [], r.x
    for w in weights:
        width = free * w / total
        out.append(Rect(x, r.y, width, r.h))
        x += width + gap
    return out


def inset(r, dx, dy=None):
    dy = dx if dy is None else dy
    return Rect(r.x + dx, r.y + dy, max(0.0, r.w - 2 * dx), max(0.0, r.h - 2 * dy))


def band(r, a, b):
    return Rect(r.x, r.y + r.h * a, r.w, r.h * (b - a))


class Layout:
    def __init__(self, area, unit, gap, landscape, radius, scene, n):
        self.area, self.unit, self.gap = area, unit, gap
        self.landscape, self.radius = landscape, radius
        self.scene, self.n = scene, n
        self.texts = []  # (index, rect, align, order)
        self.shapes = []  # dict(kind, rect, fill, radius, label, order, extra)

    def place(self, index, rect, align="center", order=None):
        if 0 <= index < self.n:
            self.texts.append((index, rect, align, index if order is None else order))

    def shape(self, kind, rect, fill, order, label=None, **extra):
        radius = rect.w / 2 if kind == "dot" else self.radius / 3 if kind == "bar" else self.radius
        self.shapes.append(dict(kind=kind, rect=rect, fill=fill, radius=radius, label=label, order=order, **extra))

    def centered(self, region, weights, align="center", offset=0):
        for i, r in enumerate(stack(region, weights, self.gap)):
            self.place(i, r, align, order=i + offset)


def fill(n, w):
    return [w] * max(0, n)


def layout_title(L):
    L.centered(band(L.area, 0.18, 0.82), [3] + fill(L.n - 1, 1.4))


def layout_kinetic(L):
    rects = stack(band(L.area, 0.12, 0.88), [4] + fill(L.n - 1, 1.5), L.gap)
    for i, r in enumerate(rects):
        L.place(i, r, order=i if i == 0 else i + 1)
    if rects and L.n > 0:
        head, w = rects[0], L.area.w * 0.3
        L.shape("divider", Rect(L.area.x + (L.area.w - w) / 2, head.y + head.h + L.gap * 0.3, w, L.unit), "accent", 1)


def layout_bullets(L):
    rects = stack(L.area, [1.3] + fill(L.n - 1, 1), L.gap)
    for i, r in enumerate(rects):
        if i == 0:
            L.place(0, r)
            continue
        L.shape("card", r, "surface", i)
        pad = L.unit * 3
        d = min(L.unit * 3, r.h / 3)
        L.shape("dot", Rect(r.x + pad, r.y + (r.h - d) / 2, d, d), "accent", i)
        L.place(i, Rect(r.x + pad * 2 + d, r.y + pad / 2, r.w - pad * 3 - d, r.h - pad), "left")


def layout_stat(L):
    L.centered(band(L.area, 0.1, 0.9), [3.2] + fill(L.n - 1, 1.2))


def layout_chart(L):
    values = (L.scene.get("chart") or {}).get("values") or []
    labels = max(0, L.n - 1)
    bars = len(values) or labels or 3
    weights = [1.1, 3, 1 if L.landscape else max(1, labels * 0.55)] if labels else [1.1, 3]
    parts = stack(L.area, weights if L.n else [0, 1], L.gap)
    head, chart = parts[0], parts[1]
    legend = parts[2] if len(parts) > 2 else None
    L.place(0, head)
    top = max(values) if values else 0
    value_h = chart.h * 0.16 if values else 0
    for i, col in enumerate(columns(chart, fill(bars, 1), L.gap)):
        share = (values[i] / top if top else 0) if values else (0.35 + 0.65 * (i + 1) / bars)
        h = max(L.unit, (chart.h - value_h) * share)
        rect = Rect(col.x, col.y + col.h - h, col.w, h)
        L.shape("bar", rect, "accent" if i % 2 else "primary", 1 + i, grow=True)
        if values:
            L.shape("value", Rect(col.x, rect.y - value_h, col.w, value_h), "text", 1 + i, value=values[i])
    if not legend or not labels:
        return
    if L.landscape:
        for i, r in enumerate(columns(legend, fill(labels, 1), L.gap)):
            L.place(i + 1, r, order=1 + i)
    else:
        for i, r in enumerate(stack(legend, fill(labels, 1), L.gap / 2)):
            d = min(L.unit * 3, r.h / 2)
            L.shape("dot", Rect(r.x, r.y + (r.h - d) / 2, d, d), "accent" if i % 2 else "primary", 1 + i)
            L.place(i + 1, Rect(r.x + d * 2, r.y, r.w - d * 2, r.h), "left", order=1 + i)


def layout_icon_grid(L):
    icons = L.scene.get("icons") or []
    labels = max(0, L.n - 1)
    cells = max(labels, len(icons))
    if not cells:
        return L.centered(band(L.area, 0.3, 0.7), [1])
    head, grid = stack(L.area, [1, 4], L.gap)
    L.place(0, head)
    cols = min(cells, 4 if L.landscape else 2)
    rows = math.ceil(cells / cols)
    row_rects = stack(grid, fill(rows, 1), L.gap)
    for k in range(cells):
        row = row_rects[k // cols]
        cell = columns(row, fill(cols, 1), L.gap)[k % cols]
        side = min(cell.w, cell.h * 0.6)
        tile = Rect(cell.x + (cell.w - side) / 2, cell.y, side, side)
        L.shape("icon", tile, "surface", 1 + k, label=icons[k] if k < len(icons) else "")
        top = tile.y + tile.h + L.gap * 0.4
        L.place(k + 1, Rect(cell.x, top, cell.w, cell.y + cell.h - top), order=1 + k)


def layout_image_focus(L):
    name = L.scene.get("image") or "image"
    if not L.n:
        return L.shape("image", L.area, "surface", 0, label=name)
    weights = [2] + fill(L.n - 1, 1.3)
    if L.landscape:
        img, text = columns(L.area, [1.3, 1], L.gap * 1.5)
        L.shape("image", img, "surface", 0, label=name)
        L.centered(band(text, 0.1, 0.9), weights, "left", offset=1)
    else:
        img, text = stack(L.area, [3.2, 1 + L.n * 0.5], L.gap)
        L.shape("image", img, "surface", 0, label=name)
        L.centered(text, weights, offset=1)


def layout_quote(L):
    mark = L.unit * 10
    top = L.area.y + L.area.h * 0.08
    L.shape("quote-mark", Rect(L.area.x, top, mark, mark), "accent", 0)
    region = Rect(L.area.x, top + mark * 1.2, L.area.w, L.area.h * 0.84 - mark * 1.2)
    L.centered(region, [4] + fill(L.n - 1, 1), "left", offset=1)


def layout_comparison(L):
    head, body = stack(L.area, [1, 4], L.gap)
    L.place(0, head)
    cards = columns(body, [1, 1], L.gap) if L.landscape else stack(body, [1, 1], L.gap)
    for c, card in enumerate(cards):
        L.shape("card", card, "surface", 1 + c)
        items = list(range(1 + c, L.n, 2))
        for k, r in enumerate(stack(inset(card, L.unit * 3), fill(len(items), 1), L.gap / 2)):
            L.place(items[k], r, order=1 + c)


def layout_cta(L):
    rects = stack(band(L.area, 0.15, 0.85), [2.4] + fill(L.n - 1, 1.1), L.gap)
    for i, r in enumerate(rects):
        if i != 1:
            L.place(i, r)
            continue
        w = r.w * 0.8
        button = Rect(r.x + (r.w - w) / 2, r.y, w, r.h)
        L.shape("button", button, "primary", 1)
        L.place(1, inset(button, L.unit * 3, L.unit * 1.5))


LAYOUTS = {
    "title": layout_title,
    "kinetic-text": layout_kinetic,
    "bullets": layout_bullets,
    "stat": layout_stat,
    "chart": layout_chart,
    "icon-grid": layout_icon_grid,
    "image-focus": layout_image_focus,
    "quote": layout_quote,
    "comparison": layout_comparison,
    "cta": layout_cta,
}

# Palette colour behind a text, by the shape it sits on.
BACKDROP = {"card": "surface", "button": "primary"}


# ---------------------------------------------------------------- drawing


def supersampled(size, draw_fn, ss=3):
    """Draw at ss× and downscale, for antialiased shapes."""
    w, h = max(1, int(round(size[0]))), max(1, int(round(size[1])))
    big = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(big), ss, w * ss, h * ss)
    return big.resize((w, h), Image.LANCZOS)


def rounded(size, color, radius):
    def draw(d, ss, w, h):
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=max(0, radius * ss), fill=color)

    return supersampled(size, draw)


def ellipse(size, color):
    def draw(d, ss, w, h):
        d.ellipse([0, 0, w - 1, h - 1], fill=color)

    return supersampled(size, draw)


def text_image(lines, font, size, color, rect, align, line_height):
    """Lines laid out like the site preview: centred vertically, CSS-style line boxes."""
    img = Image.new("RGBA", (max(1, int(rect.w)), max(1, int(rect.h))), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ascent, descent = font.getmetrics()
    line_box = size * line_height
    y = (rect.h - line_box * len(lines)) / 2
    words = []
    for line in lines:
        width = font.getlength(line)
        x = (rect.w - width) / 2 if align == "center" else 0
        baseline = y + (line_box - (ascent + descent)) / 2 + ascent
        d.text((x, baseline), line, font=font, fill=color, anchor="ls")
        cursor = x
        for word in line.split(" "):
            words.append((word, cursor, baseline))
            cursor += font.getlength(word + " ")
        y += line_box
    return img, words


def word_images(words, font, color, rect):
    """One transparent layer per word, for word-by-word reveals."""
    out = []
    for word, x, baseline in words:
        img = Image.new("RGBA", (max(1, int(rect.w)), max(1, int(rect.h))), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((x, baseline), word, font=font, fill=color, anchor="ls")
        out.append(img)
    return out


def cover(img, w, h):
    scale = max(w / img.width, h / img.height)
    img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def contain(img, w, h):
    scale = min(w / img.width, h / img.height)
    return img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)


def as_array(img):
    return np.asarray(img, dtype=np.float32)


def blit(frame, img, x, y, opacity=1.0):
    """Alpha-composite an RGBA image (PIL or float32 array) onto an RGB numpy frame."""
    if opacity <= 0.003:
        return
    arr = img if isinstance(img, np.ndarray) else as_array(img)
    h, w = arr.shape[:2]
    x, y = int(round(x)), int(round(y))
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(frame.shape[1], x + w), min(frame.shape[0], y + h)
    if x1 <= x0 or y1 <= y0:
        return
    src = arr[y0 - y : y1 - y, x0 - x : x1 - x]
    a = src[..., 3:4] * (opacity / 255.0)
    region = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = (region * (1 - a) + src[..., :3] * a).astype(np.uint8)


# ---------------------------------------------------------------- audio


def ffmpeg_exe():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def decode_audio(path, ffmpeg):
    out = subprocess.run(
        [ffmpeg, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def trim_silence(samples, threshold=0.004):
    idx = np.where(np.abs(samples) > threshold)[0]
    if not len(idx):
        return samples[:0]
    start = max(0, idx[0] - int(0.02 * SR))
    end = min(len(samples), idx[-1] + int(0.05 * SR))
    return samples[start:end]


MALE = ("male", "man", "guy", "deep", "masculine")
FEMALE = ("female", "woman", "girl", "feminine")


def voice_gender(pref):
    words = set(re.findall(r"[a-z]+", pref.lower()))
    if words & set(FEMALE):
        return "Female"
    if words & set(MALE):
        return "Male"
    return None


async def _edge_voices():
    import edge_tts

    return await edge_tts.list_voices()


async def _edge_speak(text, voice, rate, path):
    import edge_tts

    try:
        comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    except TypeError:
        comm = edge_tts.Communicate(text, voice, rate=rate)
    words = []
    with open(path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append((chunk["text"], chunk["offset"] / 1e7, (chunk["offset"] + chunk["duration"]) / 1e7))
    return words


class Speaker:
    """Text-to-speech with fallbacks: edge-tts, gTTS, espeak-ng, then silence."""

    def __init__(self, mode, language, voice_pref, wpm, ffmpeg, workdir, warnings, cache=None):
        self.mode, self.language, self.pref, self.wpm = mode, language, voice_pref, wpm
        self.ffmpeg, self.workdir, self.warnings = ffmpeg, workdir, warnings
        self.backend, self.voice = None, None
        self.cache = Path(cache) if cache else None

    def _choose_edge_voice(self):
        voices = asyncio.run(_edge_voices())
        locale = [v for v in voices if v["Locale"].lower() == self.language.lower()]
        if not locale:
            prefix = self.language.split("-")[0].lower()
            locale = [v for v in voices if v["Locale"].lower().startswith(prefix)]
        gender = voice_gender(self.pref)
        pool = [v for v in locale if not gender or v["Gender"] == gender] or locale
        # Prefer the natural "Multilingual" and newer voices when available.
        pool.sort(key=lambda v: (0 if "Multilingual" in v["ShortName"] else 1, v["ShortName"]))
        if not pool:
            raise RuntimeError("no edge voice for " + self.language)
        return pool[0]["ShortName"]

    def _speak(self, backend, text, index):
        path = Path(self.workdir) / ("vo-%03d" % index)
        if backend == "edge":
            if not self.voice:
                self.voice = self._choose_edge_voice()
            rate = "%+d%%" % round((self.wpm / 150 - 1) * 100)
            words = asyncio.run(_edge_speak(text, self.voice, rate, str(path) + ".mp3"))
            return str(path) + ".mp3", words
        if backend == "gtts":
            from gtts import gTTS

            lang = self.language.split("-")[0].lower()
            tld = {"en-gb": "co.uk", "en-au": "com.au", "en-in": "co.in", "pt-br": "com.br"}.get(self.language.lower(), "com")
            gTTS(text, lang=lang, tld=tld).save(str(path) + ".mp3")
            self.voice = "gTTS %s (%s)" % (lang, tld)
            return str(path) + ".mp3", []
        if backend == "espeak":
            exe = shutil.which("espeak-ng") or shutil.which("espeak")
            if not exe:
                raise RuntimeError("espeak-ng isn't installed")
            subprocess.run([exe, "-v", self.language.lower(), "-s", str(self.wpm), "-w", str(path) + ".wav", text], check=True, capture_output=True)
            self.voice = "espeak-ng " + self.language
            return str(path) + ".wav", []
        raise RuntimeError("unknown backend " + backend)

    def cache_key(self, text):
        raw = json.dumps([self.mode, self.language, self.pref, self.wpm, text], ensure_ascii=False)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    def say(self, text, index):
        """Returns (samples, word timings) or (None, []) for silence. Cached across renders."""
        if not text.strip() or self.mode == "none":
            return None, []
        key = self.cache_key(text)
        if self.cache:
            audio, meta = self.cache / (key + ".npy"), self.cache / (key + ".json")
            if audio.exists() and meta.exists():
                info = load_json(meta)
                if not self.backend or self.backend == info["backend"]:
                    self.backend, self.voice = info["backend"], info["voice"]
                    return np.load(audio), [tuple(w) for w in info["words"]]
        order = [self.backend] if self.backend else (["edge", "gtts", "espeak"] if self.mode == "auto" else [self.mode])
        for backend in order:
            try:
                file, words = self._speak(backend, text, index)
                samples = trim_silence(decode_audio(file, self.ffmpeg))
                if not len(samples):
                    raise RuntimeError("empty audio")
                self.backend = backend
                if self.cache:
                    self.cache.mkdir(parents=True, exist_ok=True)
                    np.save(self.cache / (key + ".npy"), samples)
                    with open(self.cache / (key + ".json"), "w", encoding="utf-8") as f:
                        json.dump({"backend": backend, "voice": self.voice, "words": words}, f)
                return samples, words
            except Exception as e:  # noqa: BLE001 - every backend failure means "try the next one"
                self.warnings.append("Voice-over via %s failed: %s" % (backend, str(e)[:160]))
        self.mode = "none"
        self.warnings.append("No text-to-speech worked, so the video has no narration. Captions and narration.txt still follow the script.")
        return None, []


def synth_music(duration, style, seed=7):
    """A simple, original background bed in C major, shaped by the motion style."""
    rng = np.random.default_rng(seed)
    bpm = {"calm": 72, "snappy": 104, "playful": 118}.get(style, 90)
    beat = 60 / bpm
    n = int(duration * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    chords = [[261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 329.63]]
    chord_len = beat * 8
    for c in range(int(duration / chord_len) + 1):
        start, end = int(c * chord_len * SR), min(n, int((c + 1) * chord_len * SR))
        if start >= n:
            break
        seg = t[start:end] - c * chord_len
        env = np.minimum(1, seg / 1.2) * np.minimum(1, (chord_len - seg) / 0.8)
        for f in chords[c % 4]:
            for detune in (0.997, 1.003):
                out[start:end] += 0.05 * env * np.sin(2 * np.pi * f * detune * seg)
    if style in ("snappy", "playful"):
        step = beat / 2
        for k in range(int(duration / step)):
            s = int(k * step * SR)
            length = min(n - s, int(0.35 * SR))
            if length <= 0:
                break
            chord = chords[int(k * step / chord_len) % 4]
            f = chord[k % 4] * (2 if style == "playful" else 1)
            seg = np.arange(length) / SR
            out[s : s + length] += 0.06 * np.exp(-seg * 9) * np.sin(2 * np.pi * f * seg)
        if style == "snappy":
            for k in range(int(duration / beat)):
                s = int(k * beat * SR)
                length = min(n - s, int(0.25 * SR))
                seg = np.arange(length) / SR
                out[s : s + length] += 0.12 * np.exp(-seg * 18) * np.sin(2 * np.pi * (55 + 60 * np.exp(-seg * 30)) * seg)
    out += rng.normal(0, 0.0015, n).astype(np.float32)
    rms = np.sqrt(np.mean(out**2)) or 1
    return (out / rms * 0.08).astype(np.float32)


def write_wav(path, stereo):
    data = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------------------------------------------------------------- captions


def caption_chunks(text, words, start, duration, max_chars):
    """Split narration into caption phrases with times; uses word timings when available."""
    tokens = text.split()
    chunks, current = [], []
    for tok in tokens:
        if current and len(" ".join(current + [tok])) > max_chars:
            chunks.append(current)
            current = []
        current.append(tok)
        if re.search(r"[.!?;:]$", tok) and len(" ".join(current)) > max_chars * 0.4:
            chunks.append(current)
            current = []
    if current:
        chunks.append(current)
    out = []
    if words and len(words) >= len(tokens) * 0.8:
        k = 0
        for chunk in chunks:
            first = words[min(k, len(words) - 1)]
            k += len(chunk)
            last = words[min(k - 1, len(words) - 1)]
            out.append((" ".join(chunk), start + first[1], start + last[2]))
    else:
        total = sum(len(" ".join(c)) for c in chunks) or 1
        t = start
        for chunk in chunks:
            d = duration * len(" ".join(chunk)) / total
            out.append((" ".join(chunk), t, t + d))
            t += d
    # Close gaps so captions don't flicker between phrases.
    for i in range(len(out) - 1):
        out[i] = (out[i][0], out[i][1], max(out[i][2], out[i + 1][1]))
    return out


def srt_time(sec):
    ms = int(round(sec * 1000))
    return "%02d:%02d:%02d,%03d" % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)


# ---------------------------------------------------------------- scene building


def apply_plan_defaults(scene):
    scene.setdefault("text", [])
    scene.setdefault("voiceover", "")
    scene.setdefault("icons", [])
    scene.setdefault("transition", "fade")
    if "stat" in scene:
        scene["stat"] = {"prefix": "", "suffix": "", "decimals": 0, **scene["stat"]}
    if "chart" in scene:
        scene["chart"] = {"labels": [], "prefix": "", "suffix": "", **scene["chart"]}
    return scene


def fmt_number(value, decimals, prefix="", suffix=""):
    body = ("{:,.%df}" % decimals).format(value)
    return "%s%s%s" % (prefix, body, suffix)


class Element:
    """One drawable piece of a scene with its entrance order."""

    def __init__(self, kind, image, x, y, order, **extra):
        self.kind, self.image, self.x, self.y, self.order = kind, image, x, y, order
        self.extra = extra
        self.array = as_array(image)  # cached for frames where it's drawn unchanged
        if "words" in extra:
            extra["words"] = [as_array(w) for w in extra["words"]]


class Renderer:
    def __init__(self, brief, plan, args, warnings):
        self.brief, self.plan, self.args, self.warnings = brief, plan, args, warnings
        self.config = load_json(REFS / "render-config.json")
        s = args.scale
        c, z = brief["canvas"], brief["safeZone"]
        self.W, self.H, self.fps = int(round(c["width"] * s)), int(round(c["height"] * s)), c["fps"]
        self.W -= self.W % 2
        self.H -= self.H % 2
        self.content = Rect(z["left"] * s, z["top"] * s, (c["width"] - z["left"] - z["right"]) * s, (c["height"] - z["top"] - z["bottom"]) * s)
        self.min_px = math.ceil(c["height"] * brief["rules"]["minFontPctOfHeight"] / 100) * s
        self.palette = brief["theme"]["palette"]
        self.rgba = {k: hex_rgb(v) + (255,) for k, v in self.palette.items()}
        self.fonts = FontBook(warnings)
        self.lh = self.config["lineHeight"]
        style = self.config["motionStyles"][brief["theme"]["motionStyle"]]
        self.ease = cubic_bezier(*style["easing"])
        self.entrance, self.exit, self.stagger = style["entranceMs"] / 1000, style["exitMs"] / 1000, style["staggerMs"] / 1000
        captions = brief["captions"]
        self.captions_on = captions["enabled"] and brief["voiceover"]["enabled"]
        self.caption_band = None
        unit = min(self.content.w, self.content.h) / 100
        self.area = self.content
        if self.captions_on:
            h = math.ceil(self.min_px * self.lh * captions["maxLines"] + unit * 4)
            self.caption_band = Rect(self.content.x, self.content.y + self.content.h - h, self.content.w, h)
            self.area = Rect(self.content.x, self.content.y, self.content.w, max(0.0, self.content.h - h - unit * 3))
        self.unit = min(self.area.w, self.area.h) / 100
        self.checks = []
        self.bg_frame = np.zeros((self.H, self.W, 3), dtype=np.uint8)
        self.bg_frame[:] = hex_rgb(self.palette["background"])
        glow = int(min(self.W, self.H) * 0.9)
        self.glow = as_array(ellipse((glow, glow), hex_rgb(self.palette["surface"]) + (150,)))

    # -------- per-scene layout and sprites

    def text_style(self, role):
        s = self.config["textRoles"][role]
        fonts = self.brief["theme"]["fonts"]
        return fonts[s["font"]], s["weight"], s["color"]

    def build_scene(self, scene):
        texts = list(scene["text"])
        chart = scene.get("chart")
        if scene["pattern"] == "chart" and chart and len(texts) <= 1 and chart["labels"]:
            texts += [{"role": "label", "text": label} for label in chart["labels"]]
        scene = dict(scene, text=texts)
        L = Layout(self.area, self.unit, self.unit * 3, self.area.w > self.area.h * 1.15, self.brief["theme"]["cornerRadius"] * self.args.scale, scene, len(texts))
        LAYOUTS[scene["pattern"]](L)
        elements, report = [], {"id": scene["id"], "texts": []}

        backdrop_of = {}
        for sh in L.shapes:
            r = sh["rect"]
            if sh["kind"] in ("card", "button"):
                for idx, tr, _, _ in L.texts:
                    if tr.x >= r.x - 1 and tr.y >= r.y - 1 and tr.x + tr.w <= r.x + r.w + 1 and tr.y + tr.h <= r.y + r.h + 1:
                        backdrop_of[idx] = BACKDROP[sh["kind"]]
            elements.extend(self.shape_elements(sh, scene))

        for idx, rect, align, order in L.texts:
            item = texts[idx]
            family, weight, color = self.text_style(item["role"])
            max_size = max(self.min_px, self.unit * self.config["roleSizeUnits"][item["role"]])
            content = item["text"]
            stat = scene.get("stat")
            if scene["pattern"] == "stat" and stat and item["role"] == "stat":
                content = fmt_number(stat["value"], stat["decimals"], stat["prefix"], stat["suffix"])
            fit = fit_text(content, rect, family, weight, max_size, self.min_px, self.brief["rules"]["maxTextLinesPerBlock"], self.fonts, self.lh)
            font = self.fonts.get(family, weight, fit["size"])
            img, words = text_image(fit["lines"], font, fit["size"], self.rgba[color], rect, align, self.lh)
            extra = {}
            if scene["pattern"] == "kinetic-text" and idx == 0:
                extra["words"] = word_images(words, font, self.rgba[color], rect)
            if scene["pattern"] == "stat" and stat and item["role"] == "stat":
                extra["count"] = dict(stat, font=font, size=fit["size"], color=self.rgba[color], rect=rect, align=align)
            elements.append(Element("text", img, rect.x, rect.y, order, rect=rect, **extra))
            backdrop = backdrop_of.get(idx, "background")
            ratio = contrast(self.palette[color], self.palette[backdrop])
            report["texts"].append(
                {
                    "role": item["role"],
                    "text": content,
                    "fits": fit["fits"],
                    "problem": fit["problem"],
                    "sizePx": round(fit["size"] / self.args.scale),
                    "minPx": round(self.min_px / self.args.scale),
                    "lines": len(fit["lines"]),
                    "contrast": round(ratio, 2),
                    "rect": [round(v / self.args.scale) for v in rect],
                    "words": len(content.split()),
                }
            )
        # Static checks: safe zone and overlaps.
        rects = [(t["rect"], t["text"]) for t in report["texts"]]
        c = [v / self.args.scale for v in self.content]
        report["outsideSafeZone"] = [
            text for (x, y, w, h), text in rects if x < c[0] - 1 or y < c[1] - 1 or x + w > c[0] + c[2] + 1 or y + h > c[1] + c[3] + 1
        ]
        overlaps = []
        for i in range(len(rects)):
            for j in range(i + 1, len(rects)):
                (ax, ay, aw, ah), (bx, by, bw, bh) = rects[i][0], rects[j][0]
                if ax + 1 < bx + bw and bx + 1 < ax + aw and ay + 1 < by + bh and by + 1 < ay + ah:
                    overlaps.append([rects[i][1], rects[j][1]])
        report["overlaps"] = overlaps
        return elements, report

    def shape_elements(self, sh, scene):
        r, kind = sh["rect"], sh["kind"]
        color = self.rgba[sh["fill"]]
        size = (max(1, r.w), max(1, r.h))
        if kind in ("card", "button", "bar", "divider"):
            img = rounded(size, color, sh["radius"] if kind != "divider" else r.h / 2)
            return [Element(kind, img, r.x, r.y, sh["order"], rect=r, grow=sh.get("grow", False))]
        if kind == "dot":
            return [Element(kind, ellipse(size, color), r.x, r.y, sh["order"], rect=r)]
        if kind == "quote-mark":
            font = self.fonts.get(self.brief["theme"]["fonts"]["heading"], 700, r.h * 1.8)
            img = Image.new("RGBA", (int(r.w * 1.6) + 1, int(r.h * 1.6) + 1), (0, 0, 0, 0))
            ImageDraw.Draw(img).text((0, 0), "“", font=font, fill=color, anchor="lt")
            return [Element(kind, img, r.x, r.y, sh["order"], rect=r)]
        if kind == "value":
            chart = scene.get("chart") or {}
            text = fmt_number(sh["value"], 0 if float(sh["value"]).is_integer() else 1, chart.get("prefix", ""), chart.get("suffix", ""))
            family, weight, _ = self.text_style("label")
            fit = fit_text(text, r, family, 700, max(self.min_px, r.h * 0.8), self.min_px, 1, self.fonts, self.lh)
            img, _ = text_image(fit["lines"], self.fonts.get(family, 700, fit["size"]), fit["size"], self.rgba["text"], r, "center", self.lh)
            return [Element("value", img, r.x, r.y, sh["order"], rect=r)]
        if kind == "icon":
            icon = self.load_icon(sh["label"])
            if icon is not None:
                # dev-icons exports finished rounded tiles: draw them as they are.
                icon = contain(icon, int(r.w), int(r.h))
                return [Element("icon", icon, r.x + (r.w - icon.width) / 2, r.y + (r.h - icon.height) / 2, sh["order"], rect=r)]
            out = [Element("tile", rounded(size, color, sh["radius"]), r.x, r.y, sh["order"], rect=r)]
            if sh["label"]:
                family, _, _ = self.text_style("label")
                fit = fit_text(sh["label"], inset(r, r.w * 0.1), family, 700, r.h * 0.3, self.min_px * 0.6, 2, self.fonts, self.lh)
                img, _ = text_image(fit["lines"], self.fonts.get(family, 700, fit["size"]), fit["size"], self.rgba["text"], r, "center", self.lh)
                out.append(Element("icon", img, r.x, r.y, sh["order"], rect=r))
            return out
        if kind == "image":
            path = self.find_file(self.args.images, sh["label"])
            if path:
                img = cover(Image.open(path).convert("RGBA"), int(r.w), int(r.h))
                mask = rounded(size, (255, 255, 255, 255), sh["radius"]).split()[3]
                img.putalpha(mask.resize(img.size))
            else:
                self.warnings.append('Image "%s" wasn\'t found; drew a placeholder.' % sh["label"])
                img = rounded(size, color, sh["radius"])
            return [Element("image", img, r.x, r.y, sh["order"], rect=r)]
        return []

    def find_file(self, folder, name):
        if not name:
            return None
        for base in [folder, "."]:
            if base and (Path(base) / name).exists():
                return Path(base) / name
        return None

    def load_icon(self, icon_id):
        if not icon_id or not self.args.icons:
            return None
        for ext in (".png", ".webp", ".jpg"):
            p = Path(self.args.icons) / (icon_id + ext)
            if p.exists():
                return Image.open(p).convert("RGBA")
        msg = 'Icon "%s" wasn\'t found in %s; showed its name instead.' % (icon_id, self.args.icons)
        if msg not in self.warnings:
            self.warnings.append(msg)
        return None

    # -------- animation

    def element_state(self, el, t, dur, transition):
        """Opacity, offset, scale and reveal for an element at scene time t."""
        start = 0.12 + el.order * self.stagger
        p = (t - start) / (0.12 if transition == "cut" else self.entrance)
        p = max(0.0, min(1.0, p))
        e = self.ease(p)
        exit_start = dur - self.exit - 0.04
        q = max(0.0, min(1.0, (t - exit_start) / self.exit))
        qe = EASE_IN(q)
        opacity = min(e if transition != "cut" else p, 1.0) * (1 - qe)
        dx = dy = 0.0
        scale, reveal = 1.0, 1.0
        u = self.unit
        if transition == "slide-up":
            dy = (1 - e) * u * 6
        elif transition == "slide-left":
            dx = (1 - e) * u * 8
        elif transition == "zoom":
            scale = 1.08 - 0.08 * e
        elif transition == "pop":
            scale = 0.82 + 0.18 * e
        elif transition == "wipe":
            reveal = e
            opacity = (1 - qe) if p > 0 else 0
        dy -= qe * u * 3
        return opacity, dx, dy, scale, reveal, e, 1 - qe

    def settled_at(self, el):
        """Scene time when an element has fully entered and stopped moving."""
        start = 0.12 + el.order * self.stagger
        if "words" in el.extra:
            return 0.12 + (len(el.extra["words"]) - 1) * max(self.stagger * 2, 0.12) + self.entrance
        if "count" in el.extra:
            return start + self.entrance + 0.8
        return start + self.entrance

    def draw_scene_frame(self, frame, elements, t, dur, transition):
        for el in elements:
            opacity, dx, dy, scale, reveal, e, staying = self.element_state(el, t, dur, transition)
            if "words" in el.extra:
                # Kinetic headline: each word rises in on its own beat, all leave together.
                beat = max(self.stagger * 2, 0.12)
                for k, word in enumerate(el.extra["words"]):
                    wp = self.ease(max(0.0, min(1.0, (t - 0.12 - k * beat) / self.entrance)))
                    y = el.y + (1 - wp) * self.unit * 4 - (1 - staying) * self.unit * 3
                    blit(frame, word, el.x, y, wp * staying)
                continue
            if opacity <= 0.003:
                continue
            img, x, y = el.array, el.x + dx, el.y + dy
            transformed = el.extra.get("grow") or "count" in el.extra or reveal < 1 or abs(scale - 1) > 0.002
            if transformed:
                img = el.image
            if el.extra.get("grow"):
                h = max(1, int(img.height * e))
                img = img.crop((0, img.height - h, img.width, img.height))
                y = el.y + el.image.height - h + dy
                opacity = 1 - (1 - opacity) * 0.3
            if "count" in el.extra:
                c = el.extra["count"]
                value = c["value"] * EASE_OUT(max(0.0, min(1.0, (t - 0.12 - el.order * self.stagger) / (self.entrance + 0.8))))
                text = fmt_number(value, c["decimals"], c["prefix"], c["suffix"])
                img, _ = text_image([text], c["font"], c["size"], c["color"], c["rect"], c["align"], self.lh)
            if reveal < 1:
                w = max(1, int(img.width * reveal))
                img = img.crop((0, 0, w, img.height))
            if abs(scale - 1) > 0.002:
                w, h = max(1, int(img.width * scale)), max(1, int(img.height * scale))
                x += (img.width - w) / 2
                y += (img.height - h) / 2
                img = img.resize((w, h), Image.BILINEAR)
            blit(frame, img, x, y, opacity)

    def caption_image(self, text, highlight=None):
        family = self.brief["theme"]["fonts"]["body"]
        band = self.caption_band
        maxlines = self.brief["captions"]["maxLines"]
        fit = fit_text(text, inset(band, self.unit * 2, 0), family, 700, self.min_px, self.min_px * 0.85, maxlines, self.fonts, self.lh)
        font = self.fonts.get(family, 700, fit["size"])
        pad = fit["size"] * 0.4
        width = max(font.getlength(line) for line in fit["lines"]) + pad * 2
        height = fit["size"] * self.lh * len(fit["lines"]) + pad
        box = Rect(0, 0, width, height)
        img = rounded((width, height), hex_rgb(self.palette["surface"]) + (235,), fit["size"] * 0.35)
        txt, _ = text_image(fit["lines"], font, fit["size"], self.rgba["text"], box, "center", self.lh)
        img.alpha_composite(txt)
        return img, fit

    # -------- whole video

    def render(self, out_dir, stills_only=False):
        scenes = [apply_plan_defaults(dict(s)) for s in self.plan["scenes"]]
        ffmpeg = ffmpeg_exe()
        if not ffmpeg and not stills_only:
            raise RuntimeError("ffmpeg isn't available: pip install imageio-ffmpeg")
        vo_cfg = self.brief["voiceover"]
        workdir = tempfile.mkdtemp(prefix="motionbrief-")
        speaker = Speaker(
            "none" if (stills_only or not vo_cfg["enabled"]) else self.args.tts,
            vo_cfg["language"],
            vo_cfg["voice"],
            vo_cfg["wordsPerMinute"],
            ffmpeg,
            workdir,
            self.warnings,
            cache=Path(out_dir) / ".vo-cache",
        )

        timeline, t0 = [], 0.0
        for i, scene in enumerate(scenes):
            samples, words = speaker.say(scene["voiceover"], i)
            vo_len = len(samples) / SR if samples is not None else 0.0
            planned = scene["durationSec"]
            dur = max(planned, vo_len + VO_LEAD + VO_TAIL) if vo_len else planned
            frames = max(1, int(math.ceil(dur * self.fps)))
            dur = frames / self.fps
            if dur > planned + 0.05:
                self.warnings.append("Scene %s runs %.1f s instead of %.1f s to fit its narration." % (scene["id"], dur, planned))
            timeline.append(dict(scene=scene, start=t0, dur=dur, frames=frames, vo=samples, words=words, vo_len=vo_len))
            t0 += dur
        total = t0

        captions = []
        max_chars = 42 if self.W >= self.H else 30
        for item in timeline:
            text = item["scene"]["voiceover"].strip()
            if text:
                start = item["start"] + VO_LEAD
                length = item["vo_len"] or (len(text.split()) * 60 / vo_cfg["wordsPerMinute"])
                captions.extend(caption_chunks(text, item["words"], start, length, max_chars))

        reports = []
        out = Path(out_dir)
        (out / "stills").mkdir(parents=True, exist_ok=True)
        proc = None
        if not stills_only:
            audio_path = self.mix_audio(timeline, total, out, ffmpeg)
            cmd = [ffmpeg, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (self.W, self.H), "-r", str(self.fps), "-i", "-"]
            if audio_path:
                cmd += ["-i", str(audio_path)]
            cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
            if audio_path:
                cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
            cmd += [str(out / "video.mp4")]
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

        cap_cache = {}
        frame_index = 0
        for n, item in enumerate(timeline):
            elements, report = self.build_scene(item["scene"])
            settled = max([self.settled_at(el) for el in elements] + [0.12 + self.entrance])
            hold_end = item["dur"] - self.exit - 0.04
            settle_frame = min(item["frames"] - 1, int(min(settled + 0.25, item["dur"] * 0.7) * self.fps))
            words_needed = sum(t["words"] for t in report["texts"]) / self.brief["rules"]["readingWordsPerSec"]
            report.update(start=round(item["start"], 2), durationSec=round(item["dur"], 2), voiceoverSec=round(item["vo_len"], 2), readableSec=round(hold_end - settled, 2), readingNeedSec=round(words_needed, 2))
            reports.append(report)
            frame_range = [settle_frame] if stills_only else range(item["frames"])
            base, base_step, held = None, None, None
            for f in frame_range:
                t = f / self.fps
                gt = item["start"] + t
                # The background glow drifts slowly, so redraw it every 4 frames.
                step = int(gt * self.fps / 4)
                if step != base_step:
                    base, base_step, held = self.bg_frame.copy(), step, None
                    gs = step * 4 / self.fps
                    gh, gw = self.glow.shape[:2]
                    blit(base, self.glow, self.W * (0.55 + 0.12 * math.sin(gs * 0.15)) - gw / 2, self.H * (0.15 + 0.1 * math.cos(gs * 0.11)) - gh / 2, 0.55)
                if settled <= t < hold_end:
                    # Everything has entered and nothing is leaving: reuse the composite.
                    if held is None:
                        held = base.copy()
                        self.draw_scene_frame(held, elements, t, item["dur"], item["scene"]["transition"])
                    frame = held.copy()
                else:
                    frame = base.copy()
                    self.draw_scene_frame(frame, elements, t, item["dur"], item["scene"]["transition"])
                if self.captions_on:
                    for text, cs, ce in captions:
                        if cs <= gt < ce:
                            if text not in cap_cache:
                                cap_cache[text] = self.caption_image(text)[0]
                            cap = cap_cache[text]
                            band = self.caption_band
                            blit(frame, cap, band.x + (band.w - cap.width) / 2, band.y + band.h - cap.height, 1.0)
                            break
                if f == settle_frame:
                    still = Image.fromarray(frame)
                    still.thumbnail((1280, 1280))
                    still.save(out / "stills" / ("%02d-%s.png" % (n + 1, item["scene"]["id"])))
                if proc:
                    proc.stdin.write(frame.tobytes())
                frame_index += 1
        if proc:
            proc.stdin.close()
            if proc.wait() != 0:
                raise RuntimeError("ffmpeg failed to encode the video")
            (out / "audio.wav").unlink(missing_ok=True)

        with open(out / "captions.srt", "w", encoding="utf-8", newline="\n") as f:
            for i, (text, s, e) in enumerate(captions, 1):
                f.write("%d\n%s --> %s\n%s\n\n" % (i, srt_time(s), srt_time(e), text))
        with open(out / "narration.txt", "w", encoding="utf-8", newline="\n") as f:
            for item in timeline:
                if item["scene"]["voiceover"].strip():
                    f.write("[%s] %s: %s\n" % (srt_time(item["start"] + VO_LEAD)[:-4], item["scene"]["id"], item["scene"]["voiceover"].strip()))
        shutil.rmtree(workdir, ignore_errors=True)
        return reports, total, speaker, captions

    def mix_audio(self, timeline, total, out, ffmpeg):
        n = int(math.ceil(total * SR)) + SR // 2
        vo = np.zeros(n, dtype=np.float32)
        for item in timeline:
            if item["vo"] is not None:
                s = int((item["start"] + VO_LEAD) * SR)
                seg = item["vo"][: max(0, n - s)]
                vo[s : s + len(seg)] += seg
        music_cfg = self.brief["music"]
        music = None
        if music_cfg["enabled"]:
            if self.args.music:
                music = decode_audio(self.args.music, ffmpeg)
                reps = int(math.ceil(n / max(1, len(music))))
                music = np.tile(music, reps)[:n]
                music = music / (np.sqrt(np.mean(music**2)) or 1) * 0.08
            else:
                music = synth_music(n / SR, self.brief["theme"]["motionStyle"])[:n]
        if not vo.any() and music is None:
            return None
        mix = vo * 0.9
        if music is not None:
            env = (np.abs(vo) > 0.01).astype(np.float32)
            k = int(0.25 * SR)
            env = np.convolve(env, np.ones(k, dtype=np.float32) / k, mode="same")
            gain = 1.0 - 0.7 * np.clip(env * 4, 0, 1)
            fade = np.ones(n, dtype=np.float32)
            fi, fo = int(1.0 * SR), int(2.0 * SR)
            fade[:fi] = np.linspace(0, 1, fi)
            fade[-fo:] = np.linspace(1, 0, fo)
            mix = mix + music[:n] * gain * fade * (1.0 if vo.any() else 2.0)
        peak = np.max(np.abs(mix)) or 1
        mix = mix / peak * 0.89
        path = out / "audio.wav"
        write_wav(path, np.stack([mix, mix], axis=1))
        return path


def summarize(reports, total, brief, speaker, warnings, captions, stills_only=False):
    rules = brief["rules"]
    failures = []
    if stills_only:
        # Scenes only stretch to fit narration in a full render, so timing isn't meaningful here.
        for r in reports:
            r["readingNeedSec"] = 0
        warnings.append("Stills only: reading time is checked in the full render.")
    for r in reports:
        for t in r["texts"]:
            if not t["fits"]:
                failures.append('%s: "%s" doesn\'t fit at the minimum size (%s); shorten it.' % (r["id"], t["text"], t["problem"]))
            if t["contrast"] < rules["minContrast"]:
                failures.append('%s: "%s" contrast %.2f:1 is below %s:1.' % (r["id"], t["text"], t["contrast"], rules["minContrast"]))
        for text in r["outsideSafeZone"]:
            failures.append('%s: "%s" is outside the safe zone.' % (r["id"], text))
        for a, b in r["overlaps"]:
            failures.append('%s: "%s" overlaps "%s".' % (r["id"], a, b))
        if r["readableSec"] + 0.05 < r["readingNeedSec"]:
            failures.append("%s: text is fully visible for %.1f s but needs %.1f s to read." % (r["id"], r["readableSec"], r["readingNeedSec"]))
    target = brief["durationSec"]
    if target and abs(total - target) > target * 0.1:
        warnings.append("Video is %.1f s; the brief asked for %s s." % (total, target))
    checks = {
        "safeZone": not any(r["outsideSafeZone"] for r in reports),
        "textFit": all(t["fits"] for r in reports for t in r["texts"]),
        "contrast": all(t["contrast"] >= rules["minContrast"] for r in reports for t in r["texts"]),
        "overlap": not any(r["overlaps"] for r in reports),
        "timing": all(r["readableSec"] + 0.05 >= r["readingNeedSec"] for r in reports),
    }
    line = "Checked: " + " ".join(("✓ " if ok else "✗ ") + name for name, ok in [("safe zone", checks["safeZone"]), ("text fit", checks["textFit"]), ("contrast", checks["contrast"]), ("no overlaps", checks["overlap"]), ("timing", checks["timing"])])
    return {
        "ok": not failures,
        "line": line,
        "durationSec": round(total, 2),
        "voiceover": {"backend": speaker.backend or "none", "voice": speaker.voice},
        "captions": len(captions),
        "failures": failures,
        "warnings": warnings,
        "checks": checks,
        "scenes": reports,
    }


def main(argv=None):
    # Reports contain ✓ and the user's text; Windows pipes default to a legacy code page.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Render a MotionBrief video to MP4.")
    ap.add_argument("--brief", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out", default="out")
    ap.add_argument("--icons", help="folder of <icon-id>.png files exported from the dev-icons skill")
    ap.add_argument("--images", help="folder holding the images the plan names")
    ap.add_argument("--music", help="audio file to use as background music")
    ap.add_argument("--tts", default="auto", choices=["auto", "edge", "gtts", "espeak", "none"])
    ap.add_argument("--scale", type=float, default=1.0, help="render smaller for a quick draft, e.g. 0.5")
    ap.add_argument("--stills-only", action="store_true", help="only save one still per scene (fast preview)")
    args = ap.parse_args(argv)

    brief, plan = load_json(args.brief), load_json(args.plan)
    errors = []
    validate(brief, load_json(REFS / "motion-brief.schema.json"), [], errors)
    if not errors:
        errors += brief_rules(brief, load_json(REFS / "presets.json"))
    plan_errors = []
    validate(plan, load_json(REFS / "motion-plan.schema.json"), [], plan_errors)
    errors += ["plan." + e for e in plan_errors]
    if errors:
        print(json.dumps({"ok": False, "errors": errors}, indent=2, ensure_ascii=False))
        return 2
    warnings = []
    if plan["briefHash"] != brief["hash"] or brief_hash(brief) != brief["hash"]:
        warnings.append("The plan's briefHash doesn't match the brief; check that they belong together.")

    renderer = Renderer(brief, plan, args, warnings)
    reports, total, speaker, captions = renderer.render(args.out, args.stills_only)
    result = summarize(reports, total, brief, speaker, warnings, captions, args.stills_only)
    with open(Path(args.out) / "report.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(json.dumps({k: result[k] for k in ("ok", "line", "durationSec", "voiceover", "failures", "warnings")}, indent=2, ensure_ascii=False))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
