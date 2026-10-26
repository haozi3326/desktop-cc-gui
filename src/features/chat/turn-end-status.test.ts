import { describe, expect, it } from "vitest";
import { CONTINUE_LATCH_SYNTHETIC_REPLY } from "./assistant-body";
import {
  assistantTextLooksPossiblyIncomplete,
  buildTurnEndStatus,
  deriveTurnEndHardState,
  engineFromSessionKey,
  lastAssistantText,
} from "./turn-end-status";
import type { Message } from "@/lib/ipc";

function questionRow(status: "pending" | "answered"): Message {
  return {
    seq: 1,
    role: "question",
    text: "Pick one",
    ts: null,
    question: {
      requestId: "req-1",
      runId: "run-1",
      toolUseId: null,
      questions: [
        {
          question: "Pick one",
          header: "Choice",
          multiSelect: false,
          options: [{ label: "A", description: "Option A" }],
        },
      ],
      status,
    },
  };
}

describe("assistantTextLooksPossiblyIncomplete", () => {
  it("flags empty and stub replies like 回代码取原", () => {
    expect(assistantTextLooksPossiblyIncomplete("")).toBe(true);
    expect(
      assistantTextLooksPossiblyIncomplete(
        "[后端开发][模式：需求澄清][模型：coding-claude]\n\n回代码取原",
      ),
    ).toBe(true);
  });

  it("does not flag a short normal sentence like 好的。", () => {
    expect(assistantTextLooksPossiblyIncomplete("好的。")).toBe(false);
  });

  it("does not flag a normal long reply", () => {
    const long =
      "审批占用金额会在单据进入审批流且占用规则命中时写入；草稿或未提交阶段通常仍为空。" +
      "具体以 CommercialFinancePostingSupport 里占用落账时机为准，你可以打开对应方法再对一下。";
    expect(assistantTextLooksPossiblyIncomplete(long)).toBe(false);
  });
});

describe("buildTurnEndStatus", () => {
  it("ignores Continue-latch synthetic text when reading the last assistant row", () => {
    const messages = [
      { seq: 1, role: "user", text: "q", ts: null },
      { seq: 2, role: "assistant", text: "好的。", ts: null },
      { seq: 3, role: "assistant", text: CONTINUE_LATCH_SYNTHETIC_REPLY, ts: null },
    ] as Message[];
    expect(lastAssistantText(messages)).toBe("好的。");
    expect(buildTurnEndStatus(messages, 1).possiblyIncomplete).toBe(false);
  });

  it("reads the last assistant row", () => {
    const messages = [
      { seq: 1, role: "user", text: "q", ts: null },
      { seq: 2, role: "assistant", text: "回代码取原", ts: null },
    ] as Message[];
    expect(lastAssistantText(messages)).toBe("回代码取原");
    expect(buildTurnEndStatus(messages, 1)).toEqual({
      at: 1,
      possiblyIncomplete: true,
      backgroundRunning: false,
      awaitingConfirmation: false,
    });
  });

  it("records background subagents and pending questions at settle", () => {
    const messages = [
      { seq: 1, role: "user", text: "go", ts: null },
      { seq: 2, role: "assistant", text: "ok", ts: null },
      {
        seq: 3,
        role: "tool",
        text: "task",
        ts: null,
        args: { tasks: [{ agent: "task", name: "WorkerA", task: "x" }] },
      },
      { ...questionRow("pending"), seq: 4 },
    ] as Message[];
    expect(
      buildTurnEndStatus(messages, 2, { engine: "omp" }),
    ).toMatchObject({
      at: 2,
      backgroundRunning: true,
      awaitingConfirmation: true,
    });
  });
});

describe("deriveTurnEndHardState", () => {
  it("clears awaiting confirmation when the question is answered", () => {
    const pending = [questionRow("pending")] as Message[];
    const answered = [questionRow("answered")] as Message[];
    expect(deriveTurnEndHardState({ messages: pending, engine: "omp" }).awaitingConfirmation).toBe(
      true,
    );
    expect(deriveTurnEndHardState({ messages: answered, engine: "omp" }).awaitingConfirmation).toBe(
      false,
    );
  });

  it("clears awaiting confirmation when a grant card is declined", () => {
    const pending = [
      {
        seq: 1,
        role: "grant",
        text: "",
        ts: null,
        grant: { status: "pending" },
      },
    ] as Message[];
    const declined = [
      {
        ...pending[0],
        grant: { status: "declined" },
      },
    ] as Message[];
    expect(deriveTurnEndHardState({ messages: pending, engine: "omp" }).awaitingConfirmation).toBe(
      true,
    );
    expect(deriveTurnEndHardState({ messages: declined, engine: "omp" }).awaitingConfirmation).toBe(
      false,
    );
  });
});

describe("engineFromSessionKey", () => {
  it("parses native and draft keys", () => {
    expect(engineFromSessionKey("claude/abc-123")).toBe("claude");
    expect(engineFromSessionKey("new:omp:/tmp/ws")).toBe("omp");
  });
});
