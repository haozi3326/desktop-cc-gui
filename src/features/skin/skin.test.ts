import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SKIN_STORAGE_KEY,
  applySkin,
  applyStoredSkin,
  isSkinWallpaperActive,
  readSkinState,
  readWallpaperChromeOpacity,
  resolveWallpaperUrl,
  setSkinDefault,
  setWallpaperChromeOpacity,
  WALLPAPER_CHROME_OPACITY_DEFAULT,
} from "./skin";

beforeEach(() => {
  localStorage.clear();
  setSkinDefault();
  delete document.documentElement.dataset.wallpaper;
});

afterEach(() => {
  delete document.documentElement.dataset.wallpaper;
});

describe("skin persistence", () => {
  it("persists builtin selection and restores on read", () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    expect(JSON.parse(localStorage.getItem(SKIN_STORAGE_KEY) ?? "{}")).toEqual({
      kind: "builtin",
      builtinId: "twilight-hills",
      chromeOpacity: WALLPAPER_CHROME_OPACITY_DEFAULT,
    });
    expect(readSkinState()).toEqual({
      kind: "builtin",
      builtinId: "twilight-hills",
      chromeOpacity: WALLPAPER_CHROME_OPACITY_DEFAULT,
    });
  });

  it("persists wallpaper chrome opacity with the skin selection", () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    setWallpaperChromeOpacity(64);
    expect(readWallpaperChromeOpacity()).toBe(64);
    expect(JSON.parse(localStorage.getItem(SKIN_STORAGE_KEY) ?? "{}").chromeOpacity).toBe(64);
    applyStoredSkin();
    expect(readWallpaperChromeOpacity()).toBe(64);
    expect(document.documentElement.style.getPropertyValue("--wallpaper-chrome-mix")).toBe("64%");
  });

  it("persists local image path", () => {
    applySkin({ kind: "local", localPath: "/tmp/wall.png" });
    expect(readSkinState()).toEqual({
      kind: "local",
      localPath: "/tmp/wall.png",
      chromeOpacity: WALLPAPER_CHROME_OPACITY_DEFAULT,
    });
    expect(resolveWallpaperUrl(readSkinState())).toContain(encodeURIComponent("/tmp/wall.png"));
  });

  it("reset clears wallpaper flag and storage", () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    setSkinDefault();
    expect(readSkinState()).toEqual({ kind: "default" });
    expect(document.documentElement.dataset.wallpaper).toBeUndefined();
    expect(isSkinWallpaperActive()).toBe(false);
  });

  it("applyStoredSkin mirrors dataset from localStorage on boot", () => {
    localStorage.setItem(
      SKIN_STORAGE_KEY,
      JSON.stringify({ kind: "builtin", builtinId: "twilight-hills" }),
    );
    applyStoredSkin();
    expect(document.documentElement.dataset.wallpaper).toBe("active");
  });
});

describe("resolveWallpaperUrl", () => {
  it("returns null for official default", () => {
    expect(resolveWallpaperUrl({ kind: "default" })).toBeNull();
  });

  it("returns bundled path for builtin pack", () => {
    expect(resolveWallpaperUrl({ kind: "builtin", builtinId: "twilight-hills" })).toBe(
      "/skins/twilight-hills.jpg",
    );
  });
});
