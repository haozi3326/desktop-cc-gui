import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "lucide-react/dist/esm/icons/settings";
import "../../index.css";
import { SettingsShell, type SettingsNavGroup } from "@/components/application/settings/settings-shell";
import { applySkin, setSkinDefault } from "./skin";

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
  it("unifies sidebar, chat shell, and bottom chrome background when wallpaper is active", () => {
    applySkin({ kind: "builtin", builtinId: "twilight-hills" });
    const sidebar = document.createElement("aside");
    sidebar.className = "bg-background-secondary-default";
    document.body.append(sidebar);
    const shell = document.createElement("div");
    shell.setAttribute("data-chat-shell", "");
    shell.className = "bg-background-primary-default";
    document.body.append(shell);
    const statusBar = document.createElement("footer");
    statusBar.className = "bg-background-primary-default";
    document.body.append(statusBar);

    const sidebarBg = getComputedStyle(sidebar).backgroundColor;
    const shellBg = getComputedStyle(shell).backgroundColor;
    const statusBg = getComputedStyle(statusBar).backgroundColor;

    expect(shellBg).toBe(sidebarBg);
    expect(statusBg).toBe(sidebarBg);
    expect(shellBg).not.toBe("transparent");
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
});
