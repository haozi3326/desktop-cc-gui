import { describe, expect, it } from "vitest";
import { stripLeadingModelModeTags } from "./prompt-display-tags";

describe("stripLeadingModelModeTags", () => {
  it("drops leading model and mode prompt headers only", () => {
    expect(
      stripLeadingModelModeTags(
        "[后端开发][模式：需求澄清][模型：coding-claude]\n\n回代码取原",
      ),
    ).toBe("[后端开发]\n\n回代码取原");
  });

  it("accepts ASCII colon and strips a header-only prefix cleanly", () => {
    expect(stripLeadingModelModeTags("[模型:coding-claude]\n\nhello")).toBe(
      "hello",
    );
    expect(stripLeadingModelModeTags("[模式:plan][模型：x]\nbody")).toBe("body");
  });

  it("leaves mid-body tags and unrelated leading tags alone", () => {
    expect(stripLeadingModelModeTags("see [模型：x] later")).toBe(
      "see [模型：x] later",
    );
    expect(stripLeadingModelModeTags("[后端开发]\n\nok")).toBe(
      "[后端开发]\n\nok",
    );
  });
});
