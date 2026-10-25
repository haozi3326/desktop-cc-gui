import { useCallback, useSyncExternalStore } from "react";
import type { PlanReviewStatus } from "@/lib/ipc";
import { readStoredJson, writeStored } from "@/lib/storage";
import { isPlanActionable } from "./store/plan-review";

export const AUTO_COMPACT_STORAGE_KEY = "ccgui-next.chat.autoCompactBySession";
const AUTO_COMPACT_CHANGED_EVENT = "ccgui-next:auto-compact-changed";
export const DEFAULT_AUTO_COMPACT_THRESHOLD = 80;

export interface AutoCompactSettings {
  enabled: boolean;
  threshold: number;
}

const DEFAULT_SETTINGS: AutoCompactSettings = Object.freeze({
  enabled: false,
  threshold: DEFAULT_AUTO_COMPACT_THRESHOLD,
});

type StoredSettings = Record<string, AutoCompactSettings>;

export function normalizeAutoCompactThreshold(value: unknown, fallback = DEFAULT_AUTO_COMPACT_THRESHOLD): number {
  const parsed =
    typeof value === "string"
      ? value.trim() === ""
        ? Number.NaN
        : Number(value)
      : typeof value === "number"
        ? value
        : Number(value);
  const safeFallback = Math.round(Math.max(1, Math.min(100, fallback)));
  if (!Number.isFinite(parsed)) return safeFallback;
  return Math.round(Math.max(1, Math.min(100, parsed)));
}

function readStoredSettings(): StoredSettings {
  const raw = readStoredJson(AUTO_COMPACT_STORAGE_KEY, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const result: StoredSettings = {};
    for (const [sessionKey, entry] of Object.entries(value)) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const record = entry as Record<string, unknown>;
      result[sessionKey] = {
        enabled: record.enabled === true,
        threshold: normalizeAutoCompactThreshold(record.threshold),
      };
    }
    return result;
  });
  return raw ?? {};
}

let settingsSnapshot = readStoredSettings();
const listeners = new Set<() => void>();

function refreshSettingsSnapshot(): void {
  settingsSnapshot = readStoredSettings();
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTO_COMPACT_CHANGED_EVENT, refreshSettingsSnapshot);
  window.addEventListener("storage", refreshSettingsSnapshot);
}

export function subscribeAutoCompactSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAutoCompactSettings(sessionKey: string): AutoCompactSettings {
  if (!sessionKey) return DEFAULT_SETTINGS;
  return settingsSnapshot[sessionKey] ?? DEFAULT_SETTINGS;
}

function updateSettings(sessionKey: string, patch: Partial<AutoCompactSettings>): void {
  if (!sessionKey) return;
  const current = readStoredSettings();
  const previous = current[sessionKey] ?? DEFAULT_SETTINGS;
  const next = {
    ...current,
    [sessionKey]: {
      enabled: patch.enabled ?? previous.enabled,
      threshold: normalizeAutoCompactThreshold(patch.threshold ?? previous.threshold, previous.threshold),
    },
  };
  writeStored(AUTO_COMPACT_STORAGE_KEY, JSON.stringify(next));
  settingsSnapshot = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTO_COMPACT_CHANGED_EVENT));
  } else {
    for (const listener of listeners) listener();
  }
}

export function setAutoCompactEnabled(sessionKey: string, enabled: boolean): void {
  updateSettings(sessionKey, { enabled });
}

export function setAutoCompactThreshold(sessionKey: string, threshold: unknown): void {
  updateSettings(sessionKey, { threshold: normalizeAutoCompactThreshold(threshold) });
}

/** Carry a pending tab's settings onto the native session it just adopted.
 *  Without this, a threshold set on a brand-new chat is lost the moment the
 *  first send resolves the session id (the key changes from `new:<engine>:<ws>`
 *  to `<engine>/<id>`). A native key that already has settings wins — the user
 *  configured that session explicitly. */
export function migrateAutoCompactSettings(fromKey: string, toKey: string): void {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const current = readStoredSettings();
  const pending = current[fromKey];
  if (!pending) return;
  const next = { ...current, [toKey]: current[toKey] ?? pending };
  delete next[fromKey];
  writeStored(AUTO_COMPACT_STORAGE_KEY, JSON.stringify(next));
  settingsSnapshot = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTO_COMPACT_CHANGED_EVENT));
  } else {
    for (const listener of listeners) listener();
  }
}

export function useAutoCompactSettings(sessionKey: string): AutoCompactSettings {
  const getSnapshot = useCallback(() => getAutoCompactSettings(sessionKey), [sessionKey]);
  return useSyncExternalStore(subscribeAutoCompactSettings, getSnapshot, () => DEFAULT_SETTINGS);
}

export interface AutoCompactDecisionInput {
  enabled: boolean;
  threshold: number;
  usagePct: number | undefined;
  streaming: boolean;
  compacting: boolean;
  /** Usage pct of this session's last threshold-triggered attempt; null =
   *  nothing tried (or re-armed). Only context that grew past that level may
   *  fire again, so a compaction that failed (or one that left usage above
   *  the threshold) cannot spin — and does not disarm the session either. */
  attemptedAtPct: number | null;
}

export function shouldAutoCompact({
  enabled,
  threshold,
  usagePct,
  streaming,
  compacting,
  attemptedAtPct,
}: AutoCompactDecisionInput): boolean {
  return Boolean(
    enabled &&
      !streaming &&
      !compacting &&
      usagePct !== undefined &&
      usagePct >= threshold &&
      (attemptedAtPct === null || usagePct > attemptedAtPct),
  );
}

/** Message slice that can park the session on a user decision. Structural on
 *  purpose: store messages satisfy it as-is, tests pass the bare fields. */
export interface ParkedInputMessage {
  role?: string;
  question?: { status?: string } | null;
  grant?: { status?: string } | null;
  planReview?: { status?: string; planId?: string; revision?: number } | null;
}

function pendingGrantInHistory(messages: readonly ParkedInputMessage[]): boolean {
  return messages.some(
    (message) => message.role === "grant" && message.grant?.status === "pending",
  );
}

/** Latest question row only — older cards stay in history but must not keep
 *  the session parked after a newer round settles. */
function pendingQuestionInHistory(messages: readonly ParkedInputMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "question") continue;
    return message.question?.status === "pending";
  }
  return false;
}

/** Mirrors PlanReviewDock / usePendingPlanReview: awaiting or submitting, or
 *  deferred only after the user reopened the card from the timeline. */
function pendingPlanReviewInHistory(
  messages: readonly ParkedInputMessage[],
  planReviewResume: string | null,
): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const record = messages[i].planReview;
    if (!record?.status) continue;
    if (record.status === "awaiting_review" || record.status === "submitting") {
      return true;
    }
    if (
      record.status === "deferred" &&
      record.planId != null &&
      record.revision != null &&
      planReviewResume === `${record.planId}:${record.revision}`
    ) {
      return true;
    }
  }
  return false;
}

/** True while the session waits on the user — the footer swaps the composer
 *  for a dock then, and sending anything would race the dialog the CLI is
 *  parked on. Answered/decided rows keep their history but stop matching. */
export function hasPendingUserInput(
  messages: readonly ParkedInputMessage[],
): boolean {
  return (
    pendingGrantInHistory(messages) ||
    pendingQuestionInHistory(messages) ||
    messages.some(
      (message) =>
        message.planReview?.status != null &&
        isPlanActionable(message.planReview.status as PlanReviewStatus),
    )
  );
}

/** Turn-end 「等你确认」 cue: same actionable surface as the docks (grant card,
 *  question dock, plan dock) — ignores superseded plans and deferred plans the
 *  user has not reopened. */
export function hasAwaitingUserConfirmation(
  messages: readonly ParkedInputMessage[],
  planReviewResume: string | null = null,
): boolean {
  return (
    pendingGrantInHistory(messages) ||
    pendingQuestionInHistory(messages) ||
    pendingPlanReviewInHistory(messages, planReviewResume)
  );
}

export interface AutoCompactResumeInput {
  trigger: "manual" | "threshold";
  /** Session error after the attempt. Every send clears it up front, so a
   *  non-null value means this attempt raised one — omp maps its compact RPC
   *  failure to 「压缩失败」 — and the task must not resume on top of it. */
  errorAfter: string | null;
  interrupted: boolean;
  streaming: boolean;
  queued: number;
  parked: boolean;
  sessionId: string | null;
}

/** After a threshold compaction the task picks itself back up — the point of
 *  auto-compact is not having to type 「继续」 by hand. A manual click stays
 *  the user's own move, and stop / queued messages / parked dialogs all mean
 *  someone else owns what happens next. */
export function shouldResumeAfterAutoCompact(
  input: AutoCompactResumeInput,
): boolean {
  return (
    input.trigger === "threshold" &&
    input.sessionId !== null &&
    input.errorAfter === null &&
    !input.interrupted &&
    !input.streaming &&
    input.queued === 0 &&
    !input.parked
  );
}
