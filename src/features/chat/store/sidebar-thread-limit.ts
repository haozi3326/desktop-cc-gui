/** New default: sessions shown per workspace before "show more". */
export const DEFAULT_SIDEBAR_THREAD_LIMIT = 15;

/** Pre-v2 default; soft-migrated to {@link DEFAULT_SIDEBAR_THREAD_LIMIT}. */
export const LEGACY_SIDEBAR_THREAD_LIMIT = 5;

/**
 * Resolve the sidebar thread limit for store hydration.
 * Missing/undefined → 15; exact legacy default 5 → 15; any other value kept.
 */
export function resolveSidebarThreadLimit(
  value: number | null | undefined,
): { limit: number; migratedFromLegacy: boolean } {
  if (value == null || !Number.isFinite(value)) {
    return { limit: DEFAULT_SIDEBAR_THREAD_LIMIT, migratedFromLegacy: false };
  }
  const n = Math.floor(value);
  if (n === LEGACY_SIDEBAR_THREAD_LIMIT) {
    return { limit: DEFAULT_SIDEBAR_THREAD_LIMIT, migratedFromLegacy: true };
  }
  return { limit: Math.max(1, n), migratedFromLegacy: false };
}
