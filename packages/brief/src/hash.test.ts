import { describe, expect, it } from "vitest";
import { canonicalJson, computeBriefHash, sha256Hex } from "./hash.js";

describe("canonicalJson", () => {
  it("sorts keys at every level and keeps array order", () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: null } })).toBe(
      '{"a":{"c":null,"d":[3,1]},"b":1}',
    );
  });

  it("drops undefined properties like JSON.stringify", () => {
    expect(canonicalJson({ a: undefined, b: "x" })).toBe('{"b":"x"}');
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalJson({ n: Number.NaN })).toThrow(/non-finite/);
  });
});

describe("hashing", () => {
  it("matches the SHA-256 test vector", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("ignores key order and the hash field itself", () => {
    const a = computeBriefHash({ x: 1, y: [1, 2], hash: "old" });
    const b = computeBriefHash({ y: [1, 2], x: 1 });
    expect(a).toBe(b);
    expect(computeBriefHash({ x: 2, y: [1, 2] })).not.toBe(a);
  });
});
