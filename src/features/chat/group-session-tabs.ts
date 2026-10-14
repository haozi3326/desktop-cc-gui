/**
 * Display-only workspace grouping for session tabs.
 * Clustering (interleaved → contiguous) lives once in use-chat-tabs via
 * clusterByWorkspacePath. groupSessionTabs only partitions already-contiguous
 * tabs into groups for strip chrome (chips / separators).
 */

/** Minimal shape: anything with a workspace path (session tabs). */
export type WorkspaceKeyedTab = {
  workspacePath: string;
};

/**
 * Cluster tabs by workspacePath in first-seen order; within each group keep
 * the input relative order. Example: [A1, B1, A2] → [A1, A2, B1].
 */
export function clusterByWorkspacePath<T extends WorkspaceKeyedTab>(tabs: T[]): T[] {
  if (tabs.length <= 1) return tabs.slice();
  const order: string[] = [];
  const buckets = new Map<string, T[]>();
  for (const tab of tabs) {
    const key = tab.workspacePath;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.push(tab);
  }
  // Already contiguous in first-seen order — skip the copy.
  if (order.length <= 1) return tabs.slice();
  const out: T[] = [];
  for (const key of order) {
    const bucket = buckets.get(key);
    if (bucket) out.push(...bucket);
  }
  return out;
}

/** One contiguous workspace group after clustering. */
export interface SessionTabGroup<T extends WorkspaceKeyedTab> {
  workspacePath: string;
  /** Short name for an optional chip; may be empty. */
  shortName?: string;
  tabs: T[];
}

/**
 * Partition already-contiguous session tabs into workspace groups for chrome.
 * Does **not** re-cluster: callers must pass tabs clustered by
 * clusterByWorkspacePath (use-chat-tabs does this once). Within each run of
 * the same workspacePath, order is preserved. Pass shortNameFor for chip labels.
 */
export function groupSessionTabs<T extends WorkspaceKeyedTab>(
  tabs: T[],
  shortNameFor?: (workspacePath: string) => string | undefined,
): SessionTabGroup<T>[] {
  const groups: SessionTabGroup<T>[] = [];
  for (const tab of tabs) {
    const last = groups[groups.length - 1];
    if (last && last.workspacePath === tab.workspacePath) {
      last.tabs.push(tab);
    } else {
      groups.push({
        workspacePath: tab.workspacePath,
        shortName: shortNameFor?.(tab.workspacePath),
        tabs: [tab],
      });
    }
  }
  return groups;
}

/** True when the strip should paint group chrome (≥2 workspaces present). */
export function shouldShowWorkspaceGroupChrome(groupCount: number): boolean {
  return groupCount >= 2;
}
