/**
 * Display-only clustering for session tabs by workspacePath.
 * Does not rewrite openTabs / store order — callers keep store indices for
 * select/close/reorder, and only use the clustered list for rendering.
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
 * Build display groups from (already clustered or raw) session tabs.
 * Groups are first-seen by workspacePath; within-group order preserved.
 * Pass shortNameFor when the strip should show a chip label.
 */
export function groupSessionTabs<T extends WorkspaceKeyedTab>(
  tabs: T[],
  shortNameFor?: (workspacePath: string) => string | undefined,
): SessionTabGroup<T>[] {
  const clustered = clusterByWorkspacePath(tabs);
  const groups: SessionTabGroup<T>[] = [];
  for (const tab of clustered) {
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
