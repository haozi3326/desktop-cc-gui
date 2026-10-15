import { describe, expect, it } from "vitest";
import {
  assistantTextLooksPossiblyIncomplete,
  buildTurnEndStatus,
  lastAssistantText,
} from "./turn-end-status";
import type { Message } from "@/lib/ipc";

describe("assistantTextLooksPossiblyIncomplete", () => {
  it("flags empty and stub replies like 回代码取原", () => {
    expect(assistantTextLooksPossiblyIncomplete("")).toBe(true);
    expect(
      assistantTextLooksPossiblyIncomplete(
        "[后端开发][模式：需求澄清][模型：coding-claude]\n\n回代码取原",
      ),
    ).toBe(true);
    expect(assistantTextLooksPossiblyIncomplete("好的。")).toBe(true);
  });

  it("does not flag a normal long reply", () => {
    const long =
      "审批占用金额会在单据进入审批流且占用规则命中时写入；草稿或未提交阶段通常仍为空。" +
      "具体以 CommercialFinancePostingSupport 里占用落账时机为准，你可以打开对应方法再对一下。";
    expect(assistantTextLooksPossiblyIncomplete(long)).toBe(false);
  });
});

describe("buildTurnEndStatus", () => {
  it("reads the last assistant row", () => {
    const messages = [
      { seq: 1, role: "user", text: "q", ts: null },
      { seq: 2, role: "assistant", text: "回代码取原", ts: null },
    ] as Message[];
    expect(lastAssistantText(messages)).toBe("回代码取原");
    expect(buildTurnEndStatus(messages, 1)).toEqual({
      at: 1,
      possiblyIncomplete: true,
    });
  });
});
