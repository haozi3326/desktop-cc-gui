/** Permission-denial cards: normalize paths scraped from CLI stderr and
 *  remember user-dismissed targets so the same vanished temp dir does not
 *  re-prompt in a tight loop. */

const suppressedBySession = new Map<string, Set<string>>();

/** Vitest-only: grant suppression is module-global. */
export function resetGrantSuppressions(): void {
  suppressedBySession.clear();
}

/** Stable key for dedupe / suppression (resolved path preferred). */
export function grantSuppressionKey(path: string | null, message: string): string {
  const resolved = resolveGrantDeniedPath(path, message);
  if (resolved) return `path:${resolved}`;
  const trimmed = message.trim();
  return trimmed ? `msg:${trimmed.slice(0, 240)}` : "msg:__empty__";
}

export function isGrantSuppressed(sessionKey: string, path: string | null, message: string): boolean {
  const set = suppressedBySession.get(sessionKey);
  if (!set) return false;
  return set.has(grantSuppressionKey(path, message));
}

export function rememberSuppressedGrant(
  sessionKey: string,
  path: string | null,
  message: string,
): void {
  const key = grantSuppressionKey(path, message);
  const set = suppressedBySession.get(sessionKey) ?? new Set<string>();
  set.add(key);
  suppressedBySession.set(sessionKey, set);
}

/** Shell tool stderr often arrives as the `path` field. Never treat that blob
 *  as a filesystem path; pull the first find(1) target when possible. */
export function resolveGrantDeniedPath(
  rawPath: string | null | undefined,
  message: string,
): string | null {
  const path = rawPath?.trim() ?? "";
  const msg = message.trim();
  if (!path) return extractPathFromShellError(msg);
  if (looksLikeShellErrorBlob(path)) {
    return extractPathFromShellError(path) ?? extractPathFromShellError(msg);
  }
  return path;
}

function looksLikeShellErrorBlob(text: string): boolean {
  if (text.includes("\n")) return true;
  const lower = text.toLowerCase();
  const markers = ["exit code", "find:", "permission denied"];
  const hits = markers.filter((m) => lower.includes(m)).length;
  return hits >= 2 || (lower.includes("find:") && lower.includes("permission denied"));
}

/** First path-like token from find / permission-denied stderr. */
export function extractPathFromShellError(text: string): string | null {
  if (!text.trim()) return null;
  const findQuoted =
    /find:\s*'([^']+)'\s*:\s*Permission denied/i.exec(text) ??
    /find:\s*"([^"]+)"\s*:\s*Permission denied/i.exec(text);
  if (findQuoted?.[1]) return findQuoted[1].trim();
  const findBare = /find:\s*([^\s:]+)\s*:\s*Permission denied/i.exec(text);
  if (findBare?.[1]) return findBare[1].trim();
  const lineDenied = /^\s*((?:\.\.?\/|\/)[^\s:]+)\s*:\s*Permission denied/im.exec(text);
  if (lineDenied?.[1]) return lineDenied[1].trim();
  const rel = /(?:^|\s)((?:\.\.?\/)[^\s'"]+)/m.exec(text);
  if (rel?.[1]) return rel[1].trim();
  return null;
}
