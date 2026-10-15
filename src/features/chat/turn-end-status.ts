import type { Message } from "@/lib/ipc";

/** Post-settle strip: clear 「响应中」, show 「已结束」 (+ optional incomplete tip). */
export interface TurnEndStatus {
  at: number;
  possiblyIncomplete: boolean;
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

export function buildTurnEndStatus(messages: Message[], at = Date.now()): TurnEndStatus {
  return {
    at,
    possiblyIncomplete: assistantTextLooksPossiblyIncomplete(lastAssistantText(messages)),
  };
}
