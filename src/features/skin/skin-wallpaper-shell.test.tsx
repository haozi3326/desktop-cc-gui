import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "lucide-react/dist/esm/icons/settings";
import "../../index.css";
import { SettingsShell, type SettingsNavGroup } from "@/components/application/settings/settings-shell";
import { applySkin, setSkinDefault, setWallpaperChromeOpacity } from "./skin";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const GROUPS: SettingsNavGroup[] = [
  {
    id: "system",
    label: "系统",
    items: [{ key: "demo", label: "演示页", icon: Settings }],
  },
];

function backgroundAlpha(color: string): number {
  if (color === "transparent") return 0;
  const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/);
  if (rgba) return Number(rgba[4]);
  return 1;
}

beforeEach(() => {
  localStorage.clear();
  setSkinDefault();
});

afterEach(() => {
  setSkinDefault();
  document.body.innerHTML = "";
});

describe("wallpaper layout contracts", () => {
  it("unifies sidebar, chat shell, file panel, and bottom chrome background when wallpaper is active", () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    const sidebar = document.createElement("aside");
    sidebar.className = "bg-background-secondary-default";
    document.body.append(sidebar);
    const column = document.createElement("div");
    column.setAttribute("data-chat-column-chrome", "");
    column.className = "bg-background-primary-default";
    const shell = document.createElement("div");
    shell.setAttribute("data-chat-shell", "");
    shell.className = "bg-background-primary-default";
    column.append(shell);
    const rightPanelChrome = document.createElement("div");
    rightPanelChrome.setAttribute("data-file-panel-chrome", "");
    rightPanelChrome.className = "bg-background-primary-default";
    document.body.append(rightPanelChrome);
    const rightPanelShell = document.createElement("div");
    rightPanelShell.setAttribute("data-file-panel-chrome", "");
    rightPanelShell.setAttribute("data-chat-shell", "");
    rightPanelShell.className = "bg-background-primary-default";
    column.append(rightPanelShell);
    document.body.append(column);
    const statusBar = document.createElement("footer");
    statusBar.setAttribute("data-chat-bleed-surface", "");
    statusBar.className = "bg-background-primary-default";
    column.append(statusBar);

    const sidebarBg = getComputedStyle(sidebar).backgroundColor;
    const columnBg = getComputedStyle(column).backgroundColor;
    const rightBg = getComputedStyle(rightPanelChrome).backgroundColor;
    const shellBg = getComputedStyle(shell).backgroundColor;
    const rightShellBg = getComputedStyle(rightPanelShell).backgroundColor;
    const statusBg = getComputedStyle(statusBar).backgroundColor;

    expect(columnBg).toBe(sidebarBg);
    expect(rightBg).toBe(sidebarBg);
    expect(backgroundAlpha(shellBg)).toBe(0);
    expect(backgroundAlpha(rightShellBg)).toBe(0);
    expect(backgroundAlpha(statusBg)).toBe(0);
    expect(columnBg).not.toBe("transparent");
  });

  it("keeps sidebar, chat shell, file panel, and status bar in sync when chrome opacity changes", () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    setWallpaperChromeOpacity(35);
    const sidebar = document.createElement("aside");
    sidebar.className = "bg-background-secondary-default";
    document.body.append(sidebar);
    const column = document.createElement("div");
    column.setAttribute("data-chat-column-chrome", "");
    column.className = "bg-background-primary-default";
    const shell = document.createElement("div");
    shell.setAttribute("data-chat-shell", "");
    shell.className = "bg-background-primary-default";
    column.append(shell);
    const rightPanelChrome = document.createElement("div");
    rightPanelChrome.setAttribute("data-file-panel-chrome", "");
    rightPanelChrome.className = "bg-background-primary-default";
    document.body.append(rightPanelChrome);
    const rightPanelShell = document.createElement("div");
    rightPanelShell.setAttribute("data-file-panel-chrome", "");
    rightPanelShell.setAttribute("data-chat-shell", "");
    rightPanelShell.className = "bg-background-primary-default";
    column.append(rightPanelShell);
    document.body.append(column);
    const statusBar = document.createElement("footer");
    statusBar.setAttribute("data-chat-bleed-surface", "");
    statusBar.className = "bg-background-primary-default";
    column.append(statusBar);

    const atLow = getComputedStyle(sidebar).backgroundColor;
    expect(getComputedStyle(column).backgroundColor).toBe(atLow);
    expect(getComputedStyle(rightPanelChrome).backgroundColor).toBe(atLow);
    expect(backgroundAlpha(getComputedStyle(shell).backgroundColor)).toBe(0);
    expect(backgroundAlpha(getComputedStyle(rightPanelShell).backgroundColor)).toBe(0);
    expect(backgroundAlpha(getComputedStyle(statusBar).backgroundColor)).toBe(0);

    expect(document.documentElement.style.getPropertyValue("--wallpaper-chrome-mix")).toBe("35%");

    setWallpaperChromeOpacity(70);
    const atHigh = getComputedStyle(sidebar).backgroundColor;
    expect(getComputedStyle(column).backgroundColor).toBe(atHigh);
    expect(getComputedStyle(rightPanelChrome).backgroundColor).toBe(atHigh);
    expect(backgroundAlpha(getComputedStyle(shell).backgroundColor)).toBe(0);
    expect(backgroundAlpha(getComputedStyle(rightPanelShell).backgroundColor)).toBe(0);
    expect(backgroundAlpha(getComputedStyle(statusBar).backgroundColor)).toBe(0);
    expect(document.documentElement.style.getPropertyValue("--wallpaper-chrome-mix")).toBe("70%");
  });

  it("settings shell stays opaque over wallpaper so chat text does not show through", async () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    const host = document.createElement("div");
    document.body.append(host);
    const root: Root = createRoot(host);
    await act(async () => {
      root.render(
        <SettingsShell
          onClose={() => {}}
          defaultPage="demo"
          ariaLabel="设置"
          groups={GROUPS}
          titles={{ demo: "演示页" }}
          renderPage={() => <p>stub</p>}
        />,
      );
    });
    const dialog = document.querySelector<HTMLDialogElement>("dialog[data-skin-opaque]");
    expect(dialog).not.toBeNull();
    expect(backgroundAlpha(getComputedStyle(dialog!).backgroundColor)).toBeGreaterThanOrEqual(0.99);
    await act(async () => root.unmount());
  });

  it("settings shell stays opaque when chrome opacity is lowered", async () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    setWallpaperChromeOpacity(20);
    const host = document.createElement("div");
    document.body.append(host);
    const root: Root = createRoot(host);
    await act(async () => {
      root.render(
        <SettingsShell
          onClose={() => {}}
          defaultPage="demo"
          ariaLabel="设置"
          groups={GROUPS}
          titles={{ demo: "演示页" }}
          renderPage={() => <p>stub</p>}
        />,
      );
    });
    const dialog = document.querySelector<HTMLDialogElement>("dialog[data-skin-opaque]");
    expect(dialog).not.toBeNull();
    expect(backgroundAlpha(getComputedStyle(dialog!).backgroundColor)).toBeGreaterThanOrEqual(0.99);
    await act(async () => root.unmount());
  });
});
