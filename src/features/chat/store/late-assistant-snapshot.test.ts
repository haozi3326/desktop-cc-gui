import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import type { EngineEventPayload } from "@/lib/events";
import type { ChatStore } from "../store";
import { handleEngineEvents, settledRuns, type EngineEventDeps } from "./engine-events";
import { EMPTY_SESSION, runRouting } from "./stream";
import { reconcileAssistantTailFromHistory } from "./session-tail-reconcile";

vi.mock("@/lib/ipc", () => ({ ipc: { rescanSessions: vi.fn(async () => {}) } }));

const KEY = "claude/sess-late//ws";
const RUN = "run-late";

function event(kind: EngineEventPayload["kind"], data?: unknown): EngineEventPayload {
  return {
    kind,
    data,
    engine: "claude",
    sessionId: "sess-late",
    runId: RUN,
    seq: 1,
  };
}

describe("late assistant snapshot after done", () => {
  beforeEach(() => {
    settledRuns.clear();
    runRouting.set(RUN, KEY);
  });

  afterEach(() => {
    runRouting.clear();
    settledRuns.clear();
  });

  it("merges assistant text that arrives after the terminal done event", () => {
    const store = createStore<ChatStore>(() => ({
      bySession: {
        [KEY]: {
          ...EMPTY_SESSION,
          streaming: false,
          messages: [
            { seq: 1, role: "user", text: "同步字典", ts: null },
            { seq: 2, role: "tool", text: "Bash", ts: null },
          ],
        },
      },
      streamingByKey: {},
      retryingByKey: {},
      models: {},
      efforts: {},
      openTabs: [{ engine: "claude", sessionId: "sess-late", workspacePath: "/ws" }],
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

    handleEngineEvents([event("done", { usage: null })], deps);
    expect(store.getState().bySession[KEY].streaming).toBe(false);

    handleEngineEvents(
      [
        event("message", {
          role: "assistant",
          text: "字典已经同步到正式库，校验返回 CHECK OK。",
        }),
      ],
      deps,
    );

    const text = store.getState().bySession[KEY].messages.find(
      (m) => m.role === "assistant" && m.text.includes("CHECK OK"),
    )?.text;
    expect(text).toContain("字典已经同步到正式库");
  });
});

describe("reconcileAssistantTailFromHistory", () => {
  it("fills an empty live turn from transcript tail", () => {
    const live = [
      { seq: 1, role: "user" as const, text: "go", ts: null },
      { seq: 2, role: "tool" as const, text: "Read", ts: null },
    ];
    const history = [
      ...live,
      {
        seq: 3,
        role: "assistant" as const,
        text: "正式库已同步完成。",
        ts: null,
        model: "deepseek-flash",
      },
    ];
    const { messages, changed } = reconcileAssistantTailFromHistory(live, history);
    expect(changed).toBe(true);
    expect(messages.some((m) => m.text.includes("正式库已同步"))).toBe(true);
  });
});
