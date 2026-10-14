import { describe, expect, it } from "vitest";
import { paginateThreads } from "./repo-pagination";
import type { AiChatThread } from "./sidebar-types";

function threads(count: number): AiChatThread[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `codex/${index}`,
    label: `t${index}`,
    time: "1m",
  }));
}

describe("paginateThreads", () => {
  it("page 0 只露出 threadLimit 条；未 ensure 时不因列表里有较旧会话而拉长", () => {
    const result = paginateThreads(threads(12), 5, 0);
    expect(result.visibleThreads.map((thread) => thread.id)).toEqual([
      "codex/0",
      "codex/1",
      "codex/2",
      "codex/3",
      "codex/4",
    ]);
    expect(result.hiddenCount).toBe(7);
  });

  it("ensureVisibleId 在窗外时软扩到 index+1，不跳到全部", () => {
    const result = paginateThreads(threads(12), 5, 0, "codex/10");
    expect(result.visibleThreads).toHaveLength(11);
    expect(result.visibleThreads.at(-1)?.id).toBe("codex/10");
    expect(result.hiddenCount).toBe(1);
  });

  it("ensureVisibleId 已在窗内时不额外拉长", () => {
    const result = paginateThreads(threads(12), 5, 0, "codex/2");
    expect(result.visibleThreads).toHaveLength(5);
    expect(result.hiddenCount).toBe(7);
  });

  it("ensureVisibleId 未知 id 时保持原窗口", () => {
    const result = paginateThreads(threads(12), 5, 0, "codex/missing");
    expect(result.visibleThreads).toHaveLength(5);
    expect(result.hiddenCount).toBe(7);
  });

  it("page 1 软扩仍不跳 page2 全部", () => {
    // page1 base = 5+50 = 55; ensure index 70 → 71, not all 80
    const result = paginateThreads(threads(80), 5, 1, "codex/70");
    expect(result.visibleThreads).toHaveLength(71);
    expect(result.hiddenCount).toBe(9);
  });

  it("page 1 追加一页,page 2 展示全部", () => {
    expect(paginateThreads(threads(12), 5, 1).visibleThreads).toHaveLength(12);
    expect(paginateThreads(threads(80), 5, 1).visibleThreads).toHaveLength(55);
    expect(paginateThreads(threads(80), 5, 2).hiddenCount).toBe(0);
  });

  it("page 0 with limit 15 leaves a remaining hiddenCount", () => {
    const result = paginateThreads(threads(20), 15, 0);
    expect(result.visibleThreads).toHaveLength(15);
    expect(result.hiddenCount).toBe(5);
  });
});
