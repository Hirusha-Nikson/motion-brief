import { describe, expect, it } from "vitest";
import { packageName } from "./index.js";

describe("@motionbrief/brief", () => {
  it("exports its package name", () => {
    expect(packageName).toBe("@motionbrief/brief");
  });
});
