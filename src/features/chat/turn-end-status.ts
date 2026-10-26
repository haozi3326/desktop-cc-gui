import type { Message } from "@/lib/ipc";
import { lastUsableAssistantText } from "./assistant-body";
import { hasAwaitingUserConfirmation } from "./auto-compact-context";
import { deriveAgentTaskSteps } from "./components/agent-task-steps";
import { parseDraftSessionKey } from "./store/persistence";

/** Post-settle strip: clear 「响应中」, show 「已结束」 (+ optional incomplete tip). */
export interface TurnEndStatus {
  at: number;
  possiblyIncomplete: boolean;
  /** Subagents still running after the parent turn settled. */
  backgroundRunning: boolean;
  /** Question / grant / plan review still waiting on the user. */
  awaitingConfirmation: boolean;
}

export interface TurnEndHardState {
  backgroundRunning: boolean;
  awaitingConfirmation: boolean;
}

/** Short replies that end like a finished sentence are not truncation stubs. */
const ASSISTANT_STUB_SENTENCE_END = /[。！？.!?…]["'」』)]*$/u;

/**
 * Heuristic for "model dumped a stub then end_turn" — empty body or tag-only
 * chrome, or a short fragment without sentence closure. Normal short replies
 * (e.g. 「好的。」) and long finished text must not trip this.
 */
export function assistantTextLooksPossiblyIncomplete(text: string): boolean {
  const cleaned = text
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/【[^】]*】/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return true;
  const len = [...cleaned].length;
  if (len > 32) return false;
  if (ASSISTANT_STUB_SENTENCE_END.test(cleaned)) return false;
  return true;
}

/** Last assistant row with user-visible body (skips Continue-latch synthetic). */
export function lastAssistantText(messages: Message[]): string {
  return lastUsableAssistantText(messages);
}

/** Engine id from a `sessionKey` route (`engine/id` or `new:engine:path`). */
export function engineFromSessionKey(key: string): string {
  const draft = parseDraftSessionKey(key);
  if (draft) return draft.engine;
  const slash = key.indexOf("/");
  return slash > 0 ? key.slice(0, slash) : "";
}

/** Live hard-state flags while a turn is settled (!streaming) but work or a
 *  dialog is still outstanding. Recomputed from messages so hub snapshots and
 *  answered questions converge without another settle event. */
export function deriveTurnEndHardState(input: {
  messages: Message[];
  subagentHistory?: Message[];
  engine: string;
  planReviewResume?: string | null;
}): TurnEndHardState {
  const history = input.subagentHistory?.length
    ? [...input.subagentHistory, ...input.messages]
    : input.messages;
  const awaitingConfirmation = hasAwaitingUserConfirmation(
    input.messages,
    input.planReviewResume ?? null,
  );
  const steps = deriveAgentTaskSteps(history, false, input.engine);
  const backgroundRunning = steps.some((step) => step.state === "active");
  return { backgroundRunning, awaitingConfirmation };
}

export function turnEndHardStateActive(hard: TurnEndHardState): boolean {
  return hard.backgroundRunning || hard.awaitingConfirmation;
}

export interface BuildTurnEndStatusOptions {
  subagentHistory?: Message[];
  engine?: string;
}

export function buildTurnEndStatus(
  messages: Message[],
  at = Date.now(),
  options?: BuildTurnEndStatusOptions,
): TurnEndStatus {
  const hard =
    options?.engine != null && options.engine !== ""
      ? deriveTurnEndHardState({
          messages,
          subagentHistory: options.subagentHistory,
          engine: options.engine,
          planReviewResume: null,
        })
      : {
          backgroundRunning: false,
          awaitingConfirmation: hasAwaitingUserConfirmation(messages),
        };
  return {
    at,
    possiblyIncomplete: assistantTextLooksPossiblyIncomplete(lastAssistantText(messages)),
    ...hard,
  };
}
