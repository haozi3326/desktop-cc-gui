import { describe, expect, it } from "vitest";
import {
  clusterByWorkspacePath,
  groupSessionTabs,
  shouldShowWorkspaceGroupChrome,
} from "./group-session-tabs";

describe("clusterByWorkspacePath", () => {
  it("clusters by workspacePath first-seen and keeps in-group relative order", () => {
    const input = [
      { key: "A1", workspacePath: "/a" },
      { key: "B1", workspacePath: "/b" },
      { key: "A2", workspacePath: "/a" },
    ];
    expect(clusterByWorkspacePath(input).map((t) => t.key)).toEqual([
      "A1",
      "A2",
      "B1",
    ]);
  });

  it("is a no-op copy when only one workspace (or empty)", () => {
    expect(clusterByWorkspacePath([])).toEqual([]);
    const one = [
      { key: "A1", workspacePath: "/a" },
      { key: "A2", workspacePath: "/a" },
    ];
    expect(clusterByWorkspacePath(one).map((t) => t.key)).toEqual(["A1", "A2"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { key: "A1", workspacePath: "/a" },
      { key: "B1", workspacePath: "/b" },
      { key: "A2", workspacePath: "/a" },
    ];
    const copy = input.slice();
    clusterByWorkspacePath(input);
    expect(input).toEqual(copy);
  });
});

describe("groupSessionTabs", () => {
  it("partitions pre-clustered tabs into groups with optional shortName chips", () => {
    // Input must already be clustered (use-chat-tabs owns that once).
    const tabs = [
      { key: "A1", workspacePath: "/a" },
      { key: "A2", workspacePath: "/a" },
      { key: "B1", workspacePath: "/b" },
    ];
    const groups = groupSessionTabs(tabs, (p) => (p === "/a" ? "Alpha" : "Beta"));
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      workspacePath: "/a",
      shortName: "Alpha",
      tabs: [{ key: "A1" }, { key: "A2" }],
    });
    expect(groups[1]).toMatchObject({
      workspacePath: "/b",
      shortName: "Beta",
      tabs: [{ key: "B1" }],
    });
  });

  it("does not re-cluster interleaved input (single cluster path is upstream)", () => {
    const interleaved = [
      { key: "A1", workspacePath: "/a" },
      { key: "B1", workspacePath: "/b" },
      { key: "A2", workspacePath: "/a" },
    ];
    const groups = groupSessionTabs(interleaved);
    // Contiguous partition only — three runs, not two workspace clusters.
    expect(groups.map((g) => g.tabs.map((t) => t.key))).toEqual([
      ["A1"],
      ["B1"],
      ["A2"],
    ]);
  });
});

describe("shouldShowWorkspaceGroupChrome", () => {
  it("is true only for ≥2 workspace groups", () => {
    expect(shouldShowWorkspaceGroupChrome(0)).toBe(false);
    expect(shouldShowWorkspaceGroupChrome(1)).toBe(false);
    expect(shouldShowWorkspaceGroupChrome(2)).toBe(true);
  });
});
