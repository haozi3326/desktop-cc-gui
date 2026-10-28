/** True when the granted path is the user home root (not a subdirectory). */
export function isWholeHomeGrantPath(dir: string): boolean {
  const trimmed = dir.trim().replace(/\/+$/, "");
  if (!trimmed) return false;
  return /^\/Users\/[^/]+$/u.test(trimmed) || /^\/home\/[^/]+$/u.test(trimmed);
}
