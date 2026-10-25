import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarFooter } from "@/components/application/ai-chat/sidebar-chrome";

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

it("exposes an independent 换肤 nav entry beside settings", async () => {
  const onOpenSkin = vi.fn();
  await act(async () => {
    root.render(<SidebarFooter onOpenSkin={onOpenSkin} onOpenSettings={vi.fn()} />);
  });
  const buttons = [...node.querySelectorAll("button")];
  const skinBtn = buttons.find((b) => b.textContent?.includes("skin.title"));
  expect(skinBtn).toBeDefined();
  await act(async () => skinBtn!.click());
  expect(onOpenSkin).toHaveBeenCalledOnce();
});
