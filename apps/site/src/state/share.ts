/** Share links carry the brief in the URL hash, compressed. Nothing goes to a server. */
export const SHARE_PARAM = "brief";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array,
  codec: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(codec);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** `brief=<deflated, base64url JSON>` for the URL hash. */
export async function encodeShareHash(value: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(value));
  const packed = await pipe(json, new CompressionStream("deflate-raw"));
  return `${SHARE_PARAM}=${toBase64Url(packed)}`;
}

/** The value in a share hash, or null if the hash has none or is corrupt. */
export async function decodeShareHash(hash: string): Promise<unknown> {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const data = params.get(SHARE_PARAM);
  if (!data) return null;
  try {
    const json = await pipe(fromBase64Url(data), new DecompressionStream("deflate-raw"));
    return JSON.parse(new TextDecoder().decode(json));
  } catch {
    return null;
  }
}

export async function shareUrl(value: unknown, location: Pick<Location, "origin" | "pathname">) {
  return `${location.origin}${location.pathname}#${await encodeShareHash(value)}`;
}
