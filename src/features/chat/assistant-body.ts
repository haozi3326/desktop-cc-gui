import type { Message } from "@/lib/ipc";
import { isCompactCommandRow, isResumeNudgeRow } from "./internal-rows";

/** Continue-latch synthetic line the engine emits when no user-visible reply is
 *  requested. It must not count as a usable assistant body in the timeline or
 *  turn-end heuristics. */
export const CONTINUE_LATCH_SYNTHETIC_REPLY = "No response requested.";

const CONTENT_RE = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

export function isContinueLatchSyntheticReply(text: string): boolean {
  return text.trim() === CONTINUE_LATCH_SYNTHETIC_REPLY;
}

/** Harness placeholder segments ("·", ".") between tool batches — not user-visible. */
export function isHarnessPlaceholderAssistantText(text: string): boolean {
  if (!text.trim()) return false;
  return !CONTENT_RE.test(text);
}

/** True when the assistant text should read as a real reply in the timeline. */
export function assistantTextIsUsableBody(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isContinueLatchSyntheticReply(trimmed)) return false;
  if (!CONTENT_RE.test(trimmed)) return false;
  return true;
}

export function currentTurnStartIndex(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (isCompactCommandRow(m)) return i + 1;
    if (m.role === "user" && !isResumeNudgeRow(m)) return i + 1;
  }
  return 0;
}

export function turnHasUsableAssistantBody(messages: Message[]): boolean {
  const start = currentTurnStartIndex(messages);
  for (let i = start; i < messages.length; i++) {
    if (messages[i].role === "assistant" && assistantTextIsUsableBody(messages[i].text ?? "")) {
      return true;
    }
  }
  return false;
}

/** Index of the first message in the current turn (after the last user / compact). */
export function currentTurnHasRenderableAssistantRow(messages: Message[]): boolean {
  const start = currentTurnStartIndex(messages);
  for (let i = start; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    if (isHarnessPlaceholderAssistantText(m.text)) continue;
    if (isContinueLatchSyntheticReply(m.text)) continue;
    return true;
  }
  return false;
}

export function lastUsableAssistantText(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant" && assistantTextIsUsableBody(messages[i].text ?? "")) {
      return messages[i].text ?? "";
    }
  }
  return "";
}


