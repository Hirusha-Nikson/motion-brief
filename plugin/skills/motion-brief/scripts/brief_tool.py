#!/usr/bin/env python3
"""Check a MotionBrief brief or edit.

Usage:
    python3 scripts/brief_tool.py check <file>

<file> may hold a whole pasted message, a fenced ```motion-brief or ```motion-edit block,
or bare JSON. Prints a JSON report and exits 0 when the block is valid, 1 when it isn't.
Standard library only, so it runs in any Python 3.8+ sandbox.
"""

import hashlib
import json
import math
import re
import sys
from pathlib import Path

REFS = Path(__file__).resolve().parent.parent / "refs"
SITE = "https://hirusha-nikson.github.io/motion-brief/"
FENCE_OPEN = re.compile(r"^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$")


def extract_blocks(text, lang):
    """Bodies of fenced blocks tagged `lang` (``` or ~~~, up to 3 spaces indent)."""
    lines = re.split(r"\r?\n", text)
    blocks = []
    i = 0
    while i < len(lines):
        m = FENCE_OPEN.match(lines[i])
        if not m:
            i += 1
            continue
        marker = m.group(1)
        close = re.compile(r"^ {0,3}" + re.escape(marker[0]) + "{" + str(len(marker)) + r",}[ \t]*$")
        body = []
        j = i + 1
        while j < len(lines) and not close.match(lines[j]):
            body.append(lines[j])
            j += 1
        if m.group(2) == lang:
            blocks.append("\n".join(body))
        i = j + 1
    return blocks


def canonical(value):
    """Sorted-key JSON with no whitespace, matching the website's canonicalJson."""
    if value is None or isinstance(value, bool):
        return json.dumps(value)
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if not math.isfinite(value):
                raise ValueError("cannot hash a non-finite number")
            if value.is_integer() and abs(value) < 1e21:
                return str(int(value))
        return json.dumps(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ",".join(canonical(v) for v in value) + "]"
    if isinstance(value, dict):
        items = sorted(value.items(), key=lambda kv: kv[0])
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonical(v) for k, v in items) + "}"
    raise ValueError("cannot hash " + type(value).__name__)


def brief_hash(brief):
    rest = {k: v for k, v in brief.items() if k != "hash"}
    return hashlib.sha256(canonical(rest).encode("utf-8")).hexdigest()


def fmt_path(path):
    out = ""
    for key in path:
        if isinstance(key, int):
            out += "[%d]" % key
        else:
            out += ("." if out else "") + key
    return out


def type_ok(value, t):
    if t == "string":
        return isinstance(value, str)
    if t == "boolean":
        return isinstance(value, bool)
    if t == "null":
        return value is None
    if t == "object":
        return isinstance(value, dict)
    if t == "array":
        return isinstance(value, list)
    if isinstance(value, bool):
        return False
    if t == "number":
        return isinstance(value, (int, float))
    if t == "integer":
        return isinstance(value, int) or (isinstance(value, float) and value.is_integer())
    return True


def validate(value, schema, path, errors):
    """Validate against the JSON Schema subset the website generates."""
    for key in ("anyOf", "oneOf"):
        if key in schema:
            attempts = []
            for option in schema[key]:
                errs = []
                validate(value, option, path, errs)
                if not errs:
                    break
                attempts.append(errs)
            else:
                errors.extend(min(attempts, key=len) if attempts else [])
                return
    for sub in schema.get("allOf", []):
        validate(value, sub, path, errors)

    where = fmt_path(path) or "(root)"
    t = schema.get("type")
    if t is not None:
        types = t if isinstance(t, list) else [t]
        if not any(type_ok(value, x) for x in types):
            errors.append("%s: expected %s" % (where, " or ".join(types)))
            return
    if "const" in schema and value != schema["const"]:
        errors.append("%s: must be %s" % (where, json.dumps(schema["const"])))
    if "enum" in schema and value not in schema["enum"]:
        errors.append("%s: must be one of %s" % (where, ", ".join(json.dumps(x) for x in schema["enum"])))

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append("%s: must have at least %d characters" % (where, schema["minLength"]))
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append("%s: must have at most %d characters" % (where, schema["maxLength"]))
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append("%s: has an invalid format" % where)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append("%s: must be at least %s" % (where, schema["minimum"]))
        if "maximum" in schema and value > schema["maximum"]:
            errors.append("%s: must be at most %s" % (where, schema["maximum"]))
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"]:
            errors.append("%s: must be more than %s" % (where, schema["exclusiveMinimum"]))
        if "exclusiveMaximum" in schema and value >= schema["exclusiveMaximum"]:
            errors.append("%s: must be less than %s" % (where, schema["exclusiveMaximum"]))
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append("%s: must have at least %d items" % (where, schema["minItems"]))
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append("%s: must have at most %d items" % (where, schema["maxItems"]))
        if "items" in schema:
            for i, item in enumerate(value):
                validate(item, schema["items"], path + [i], errors)
    if isinstance(value, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append("%s: is required (missing)" % fmt_path(path + [key]))
        extra = schema.get("additionalProperties", True)
        for key, item in value.items():
            if key in props:
                validate(item, props[key], path + [key], errors)
            elif extra is False:
                errors.append('%s: unrecognized key "%s"' % (where, key))
            elif isinstance(extra, dict):
                validate(item, extra, path + [key], errors)


def brief_rules(brief, presets):
    """Cross-field rules the JSON Schema can't express."""
    errors = []
    canvas, zone = brief["canvas"], brief["safeZone"]
    platform = brief["platform"]
    preset = presets["platforms"].get(platform, {})
    if platform != "custom" and (canvas["width"], canvas["height"]) != (preset.get("width"), preset.get("height")):
        errors.append(
            'canvas: platform "%s" is %sx%s; got %sx%s. Use platform "custom" for other sizes.'
            % (platform, preset.get("width"), preset.get("height"), canvas["width"], canvas["height"])
        )
    share = presets.get("minContentShare", 0.25)
    box_w = canvas["width"] - zone["left"] - zone["right"]
    box_h = canvas["height"] - zone["top"] - zone["bottom"]
    if box_w < canvas["width"] * share or box_h < canvas["height"] * share:
        errors.append("safeZone: leaves only %dx%d px for content" % (box_w, box_h))
    if not brief["topic"].strip():
        errors.append("topic: describe what the video is about")
    if brief["sceneMode"] == "manual" and not brief["scenes"]:
        errors.append("scenes: add at least one scene, or let Claude plan the scenes")
    seen = set()
    for i, scene in enumerate(brief["scenes"]):
        if scene["id"] in seen:
            errors.append('scenes[%d].id: duplicate scene id "%s"' % (i, scene["id"]))
        seen.add(scene["id"])
    return errors


def load_json(name):
    with open(REFS / name, encoding="utf-8") as f:
        return json.load(f)


def locate(text):
    """Return (kind, raw JSON text) or (None, error message)."""
    for kind in ("motion-brief", "motion-edit"):
        blocks = extract_blocks(text, kind)
        if len(blocks) > 1:
            return None, "Found %d `%s` blocks. Paste only one." % (len(blocks), kind)
        if blocks:
            return kind, blocks[0]
    if text.strip().startswith("{"):
        return "json", text
    return None, "No ```motion-brief block found. Copy the prompt again from %s and paste it unchanged." % SITE


def check(text):
    report = {"kind": None, "ok": False, "errors": [], "warnings": []}
    kind, raw = locate(text)
    if kind is None:
        report["errors"].append(raw)
        return report
    try:
        data = json.loads(raw)
    except ValueError as e:
        report["errors"].append("The block isn't valid JSON (%s). It may be cut off or edited; copy it again from %s." % (e, SITE))
        return report
    schema_id = data.get("schema") if isinstance(data, dict) else None
    if schema_id == "motion-brief/v1":
        report["kind"] = "brief"
        validate(data, load_json("motion-brief.schema.json"), [], report["errors"])
        if not report["errors"]:
            report["errors"].extend(brief_rules(data, load_json("presets.json")))
        if not report["errors"]:
            if brief_hash(data) != data["hash"]:
                report["warnings"].append(
                    "The brief's hash doesn't match its content, so it was changed after export."
                )
            report["summary"] = {
                "platform": data["platform"],
                "canvas": "%dx%d @ %d fps" % (data["canvas"]["width"], data["canvas"]["height"], data["canvas"]["fps"]),
                "durationSec": data["durationSec"],
                "contentMode": data["contentMode"],
                "sceneMode": data["sceneMode"],
                "scenes": len(data["scenes"]),
                "notes": len(data["notes"]),
                "estimate": data["estimate"]["tier"],
            }
    elif schema_id == "motion-edit/v1":
        report["kind"] = "edit"
        validate(data, load_json("motion-edit.schema.json"), [], report["errors"])
        if not report["errors"]:
            report["summary"] = {
                "baseHash": data["baseHash"],
                "ops": len(data["ops"]),
                "affectedScenes": data["affectedScenes"],
            }
    else:
        report["errors"].append('Unsupported schema %s; expected "motion-brief/v1".' % json.dumps(schema_id))
    if report["errors"]:
        report["errors"].append("Fix these on %s and copy the prompt again." % SITE)
    report["ok"] = not report["errors"]
    return report


def main(argv):
    # Reports quote the user's text; Windows pipes default to a legacy code page.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 3 or argv[1] != "check":
        sys.stderr.write(__doc__)
        return 2
    text = Path(argv[2]).read_text(encoding="utf-8")
    report = check(text)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
