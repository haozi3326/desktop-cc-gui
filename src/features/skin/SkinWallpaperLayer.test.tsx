import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { applySkin, setSkinDefault } from "./skin";
import { SkinWallpaperLayer } from "./SkinWallpaperLayer";

let node: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  setSkinDefault();
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});

afterEach(async () => {
  await act(async () => root.unmount());
  node.remove();
  setSkinDefault();
});

async function renderLayer() {
  await act(async () => {
    root.render(<SkinWallpaperLayer />);
  });
}

it("renders the cover layer when a wallpaper is active", async () => {
  applySkin({ kind: "builtin", builtinId: "twilight-hills" });
  await renderLayer();
  const layer = node.querySelector("[data-testid=skin-wallpaper-layer]");
  expect(layer).not.toBeNull();
  expect((layer as HTMLElement).style.backgroundSize).toBe("cover");
});

it("omits the layer for official default", async () => {
  setSkinDefault();
  await renderLayer();
  expect(node.querySelector("[data-testid=skin-wallpaper-layer]")).toBeNull();
});
