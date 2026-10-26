import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarFooter } from "@/components/application/ai-chat/sidebar-chrome";
import { settingsRegistry } from "@ccgui/plugin-sdk";
import "../settings/sections";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/hooks/use-remote-control", () => ({
  useRemoteControl: () => false,
}));

let node: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});

afterEach(async () => {
  await act(async () => root.unmount());
  node.remove();
});

it("does not expose a standalone sidebar skin entry (wallpaper lives in Settings)", async () => {
  await act(async () => {
    root.render(<SidebarFooter onOpenSettings={vi.fn()} />);
  });
  const buttons = [...node.querySelectorAll("button")];
  const skinBtn = buttons.find((b) => b.textContent?.includes("skin.title"));
  expect(skinBtn).toBeUndefined();
});

it("registers a skin/wallpaper page in settings navigation", () => {
  const skin = settingsRegistry.get("skin");
  expect(skin).toBeDefined();
  expect(skin!.key).toBe("skin");
});
