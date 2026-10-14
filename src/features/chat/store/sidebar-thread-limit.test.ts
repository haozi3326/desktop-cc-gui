import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIDEBAR_THREAD_LIMIT,
  resolveSidebarThreadLimit,
} from "./sidebar-thread-limit";

describe("resolveSidebarThreadLimit", () => {
  it("defaults missing values to 15", () => {
    expect(resolveSidebarThreadLimit(undefined)).toEqual({
      limit: 15,
      migratedFromLegacy: false,
    });
    expect(resolveSidebarThreadLimit(null)).toEqual({
      limit: 15,
      migratedFromLegacy: false,
    });
    expect(DEFAULT_SIDEBAR_THREAD_LIMIT).toBe(15);
  });

  it("soft-migrates legacy default 5 to 15", () => {
    expect(resolveSidebarThreadLimit(5)).toEqual({
      limit: 15,
      migratedFromLegacy: true,
    });
  });

  it("keeps non-legacy custom values", () => {
    expect(resolveSidebarThreadLimit(7)).toEqual({
      limit: 7,
      migratedFromLegacy: false,
    });
    expect(resolveSidebarThreadLimit(30)).toEqual({
      limit: 30,
      migratedFromLegacy: false,
    });
    expect(resolveSidebarThreadLimit(1)).toEqual({
      limit: 1,
      migratedFromLegacy: false,
    });
  });
});
