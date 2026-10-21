import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import type { EngineEventPayload } from "@/lib/events";
import type { ChatStore } from "../store";
import { handleEngineEvents, settledRuns, type EngineEventDeps } from "./engine-events";
import { EMPTY_SESSION, runRouting } from "./stream";

vi.mock("@/lib/ipc", () => ({ ipc: { rescanSessions: vi.fn(async () => {}) } }));

const KEY = "claude/sess-checklist//ws";
const RUN = "run-checklist";

function event(kind: EngineEventPayload["kind"], data?: unknown): EngineEventPayload {
  return {
    kind,
    data,
    engine: "claude",
    sessionId: "sess-checklist",
    runId: RUN,
    seq: 1,
  };
}

describe("confirmation checklist timeline (Claude live settle)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    settledRuns.clear();
    runRouting.set(RUN, KEY);
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    runRouting.clear();
  });

  it("surfaces a long confirmation-checklist assistant snapshot after thinking-only stream", () => {
    const checklist =
      "7 条 Bug 的**问题确认清单**\n\n**① 25556【性能】** —— 要改\n**⑦ 25569** —— 不改代码";
    const store = createStore<ChatStore>(() => ({
      bySession: {
        [KEY]: {
          ...EMPTY_SESSION,
          streaming: true,
          turnStartedAt: Date.now() - 5000,
          messages: [
            { seq: 1, role: "user", text: "处理禅道 BUG", ts: null },
            { seq: 2, role: "assistant", text: "等定位结果，马上继续。", ts: null },
            { seq: 3, role: "thinking", text: "Explore 结果回来了", ts: null },
          ],
        },
      },
      streamingByKey: { [KEY]: true },
      retryingByKey: {},
      models: {},
      efforts: {},
      openTabs: [{ engine: "claude", sessionId: "sess-checklist", workspacePath: "/ws" }],
      active: null,
      drafts: {},
      archivedSessionKeys: {},
      createdSessionKeys: {},
      sessionContributions: {},
    }) as unknown as ChatStore);
    const deps: EngineEventDeps = {
      set: (update) => store.setState(update),
      get: store.getState,
      drainQueue: vi.fn(),
      markUnseenIfBackground: vi.fn(),
      upsertSessionMeta: vi.fn(),
    };

    handleEngineEvents(
      [
        event("thinking", "出确认清单"),
        event("message", { role: "assistant", text: checklist }),
        event("done", { usage: null }),
      ],
      deps,
    );

    const messages = store.getState().bySession[KEY].messages;
    const checklistRow = messages.find(
      (m) => m.role === "assistant" && m.text.includes("问题确认清单"),
    );
    expect(checklistRow?.text).toContain("①");
    expect(checklistRow?.text).toContain("⑦");
  });
});
