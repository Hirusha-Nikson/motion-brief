import { describe, expect, it } from "vitest";
import { packageName } from "./index.js";

describe("@motionbrief/motion-schema", () => {
  it("exports its package name", () => {
    expect(packageName).toBe("@motionbrief/motion-schema");
  });
});
