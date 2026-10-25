import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGitStore } from "@/features/git/store";
import { refreshFollowedBranchRepo } from "./use-branch-switcher";

describe("refreshFollowedBranchRepo", () => {
  const refresh = vi.fn(async () => {});
  const loadBranches = vi.fn(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
    useGitStore.setState({
      refresh,
      loadBranches,
    } as Partial<ReturnType<typeof useGitStore.getState>>);
  });

  it("loads branches and force-refreshes status for the repo", () => {
    refreshFollowedBranchRepo("/repo");
    expect(loadBranches).toHaveBeenCalledWith("/repo");
    expect(refresh).toHaveBeenCalledWith("/repo", true);
  });
});
