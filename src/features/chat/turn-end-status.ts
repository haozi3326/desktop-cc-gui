import type { Message } from "@/lib/ipc";
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

/**
 * Heuristic for "model dumped a stub then end_turn" — very short assistant
 * text after stripping bracketed mode tags. Long normal replies must not
 * trip this (acceptance: 正常长回复不误报).
 */
export function assistantTextLooksPossiblyIncomplete(text: string): boolean {
  const cleaned = text
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/【[^】]*】/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return true;
  // Unicode code points so CJK short stubs like 「回代码取原」 count correctly.
  return [...cleaned].length <= 32;
}

export function lastAssistantText(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].text ?? "";
  }
  return "";
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
