import type { Message } from "@/lib/ipc";
import {
  assistantTextIsUsableBody,
  currentTurnStartIndex,
  lastUsableAssistantText,
} from "../assistant-body";
import { mergeAssistantSnapshot } from "./stream";

/** After a turn settles, merge assistant body from transcript tail when the
 *  live timeline is missing or shorter than the file (late snapshots). */
export function reconcileAssistantTailFromHistory(
  live: Message[],
  history: Message[],
): { messages: Message[]; changed: boolean } {
  if (history.length === 0) return { messages: live, changed: false };

  const liveStart = currentTurnStartIndex(live);
  const histStart = currentTurnStartIndex(history);
  const liveText = lastUsableAssistantText(live.slice(liveStart));
  const histText = lastUsableAssistantText(history.slice(histStart));

  if (!assistantTextIsUsableBody(histText)) {
    return { messages: live, changed: false };
  }
  if (liveText === histText) {
    return { messages: live, changed: false };
  }
  const shouldMerge =
    !assistantTextIsUsableBody(liveText) ||
    histText.length > liveText.length ||
    (histText !== liveText && histText.startsWith(liveText));
  if (!shouldMerge) {
    return { messages: live, changed: false };
  }

  let metaRow: Message | undefined;
  for (let i = history.length - 1; i >= histStart; i--) {
    const row = history[i];
    if (row.role === "assistant" && assistantTextIsUsableBody(row.text ?? "")) {
      metaRow = row;
      break;
    }
  }

  const messages = mergeAssistantSnapshot(live, histText, {
    ts: metaRow?.ts ?? null,
    model: metaRow?.model ?? null,
    effort: metaRow?.effort ?? null,
    ...(metaRow?.durationMs != null ? { durationMs: metaRow.durationMs } : {}),
  });
  return { messages, changed: messages !== live };
}
