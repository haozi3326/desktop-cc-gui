import { describe, expect, it } from "vitest";
import {
  dumpCodepoints,
  shouldBlockNavInsert,
  COMPOSER_MISSING_IN_INTER_RE,
} from "./composer-codepoints";

describe("dumpCodepoints", () => {
  it("flags U+2192 (→) as Inter-missing and counts repeats", () => {
    const dump = dumpCodepoints("→→→");
    expect(dump.length).toBe(3);
    expect(dump.counts["U+2192"]).toBe(3);
    expect(dump.hasInterMissingSymbol).toBe(true);
    expect(dump.unique).toEqual(["U+2192"]);
  });

  it("does not flag ↑↓ (present in Inter latin) or CJK", () => {
    const dump = dumpCodepoints("已编辑↑↓");
    expect(dump.hasInterMissingSymbol).toBe(false);
    expect(COMPOSER_MISSING_IN_INTER_RE.test("↑")).toBe(false);
    expect(COMPOSER_MISSING_IN_INTER_RE.test("↓")).toBe(false);
    expect(COMPOSER_MISSING_IN_INTER_RE.test("→")).toBe(true);
    expect(COMPOSER_MISSING_IN_INTER_RE.test("←")).toBe(true);
  });

  it("empty composer dump is clean (ArrowRight-only caret path)", () => {
    const dump = dumpCodepoints("");
    expect(dump.length).toBe(0);
    expect(dump.hasInterMissingSymbol).toBe(false);
    expect(dump.unique).toEqual([]);
  });
});

describe("shouldBlockNavInsert", () => {
  it("blocks insertText paired with ArrowRight (tofu insert path)", () => {
    expect(shouldBlockNavInsert("ArrowRight", "insertText", "→")).toBe(true);
    expect(shouldBlockNavInsert("ArrowRight", "insertText", "x")).toBe(true);
    expect(shouldBlockNavInsert("ArrowLeft", "insertText", "←")).toBe(true);
  });

  it("allows normal typing and paste-like inserts", () => {
    expect(shouldBlockNavInsert("a", "insertText", "a")).toBe(false);
    expect(shouldBlockNavInsert("ArrowRight", "insertFromPaste", "→")).toBe(false);
    expect(shouldBlockNavInsert(null, "insertText", "→")).toBe(false);
  });
});

describe("composer font stack (globals.css)", () => {
  it("keeps Apple Symbols / Segoe UI Symbol ahead of generic sans", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const css = fs.readFileSync(
      path.join(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );
    const block = css.slice(css.indexOf(".composer-editable {"), css.indexOf(".composer-editable:empty"));
    expect(block).toContain('"Apple Symbols"');
    expect(block).toContain('"Segoe UI Symbol"');
    expect(block.indexOf('"Apple Symbols"')).toBeLessThan(block.indexOf("ui-sans-serif"));
  });
});
