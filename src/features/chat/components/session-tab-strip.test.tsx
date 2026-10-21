import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionTabStrip, type SessionTabItem } from "./SessionTabStrip";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  // 部分 mock：页签条的新菜单会（经分屏 store）间接引入 lib/i18n，
  // 它需要真实的 initReactI18next 才能初始化。
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});
// jsdom gaps exercised by use-tab-strip-chrome's scroll-into-view effect.
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value;
Element.prototype.scrollIntoView ??= () => {};

const TABS: SessionTabItem[] = [
  { key: "a", label: "Alpha", streaming: false },
  { key: "b", label: "Beta", streaming: false },
];

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

function menuItems(): string[] {
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(
    (el) => el.textContent ?? "",
  );
}

async function render(extra: Partial<Parameters<typeof SessionTabStrip>[0]> = {}) {
  await act(async () => {
    root.render(
      <SessionTabStrip
        tabs={TABS}
        activeKey="a"
        onSelect={() => {}}
        onClose={() => {}}
        closeLabel="close"
        onNew={() => {}}
        onNewBrowser={() => {}}
        {...extra}
      />,
    );
  });
}

/** The scroll container owns the blank area right of the "+" button. */
function scrollContainer(): HTMLElement {
  const el = node.querySelector<HTMLElement>(".overflow-x-auto");
  if (!el) throw new Error("scroll container not found");
  return el;
}

it("opens the 新建会话/新建浏览器 menu on blank-area right-click", async () => {
  await render();

  await act(async () => {
    scrollContainer().dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 300, clientY: 12 }),
    );
  });

  expect(menuItems()).toEqual(["chat.newSession", "chat.newBrowser"]);
});

it("blank-area menu entries invoke onNew / onNewBrowser", async () => {
  const onNew = vi.fn();
  const onNewBrowser = vi.fn();
  await render({ onNew, onNewBrowser });

  await act(async () => {
    scrollContainer().dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 300, clientY: 12 }),
    );
  });
  const items = [...document.body.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  await act(async () => items[1].click());

  expect(onNewBrowser).toHaveBeenCalledOnce();
  expect(onNew).not.toHaveBeenCalled();
  expect(menuItems()).toEqual([]);
});

it("keeps tab right-click on the tab menu, not the new-tab menu", async () => {
  await render({ onCloseAll: () => {} });
  const tab = node.querySelector<HTMLElement>('[data-tab-key="b"]');
  if (!tab) throw new Error("tab not found");

  await act(async () => {
    tab.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 40, clientY: 12 }),
    );
  });

  expect(menuItems()).not.toContain("chat.newSession");
  expect(menuItems()).not.toContain("chat.newBrowser");
});

it("offers no menu when onNewBrowser is omitted", async () => {
  await render({ onNewBrowser: undefined });

  await act(async () => {
    scrollContainer().dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 300, clientY: 12 }),
    );
  });

  expect(menuItems()).toEqual([]);
});

it("marks a tab with a pending notice as unread, with its own accessible name", async () => {
  await render({
    tabs: [
      ...TABS,
      { key: "notes", label: "Release Notes", streaming: false, unread: "新版本" },
    ],
  });

  // 未读提醒不借用会话活动的绿点（语义与颜色都是另一套）。
  expect(node.querySelector('[data-tab-key="b"] [role="status"]')).toBeNull();
  const dot = node.querySelector('[data-tab-key="notes"] [role="status"]');
  expect(dot?.getAttribute("aria-label")).toBe("新版本");
  expect(dot?.getAttribute("title")).toBe("新版本");
  expect(dot?.className).toContain("bg-accent-500");
});
it("shows workspace short name as a secondary suffix on session tabs", async () => {
  await render({
    tabs: [
      {
        key: "a",
        label: "Same Title",
        streaming: false,
        workspaceShortName: "CodeUi",
        title: "Same Title · CodeUi",
      },
      {
        key: "b",
        label: "Same Title",
        streaming: false,
        workspaceShortName: "novel",
        title: "Same Title · novel",
      },
    ],
  });

  const tabA = node.querySelector<HTMLElement>('[data-tab-key="a"]');
  const tabB = node.querySelector<HTMLElement>('[data-tab-key="b"]');
  expect(tabA?.getAttribute("title")).toBe("Same Title · CodeUi");
  expect(tabB?.getAttribute("title")).toBe("Same Title · novel");
  expect(tabA?.textContent).toContain("Same Title");
  expect(tabA?.textContent).toContain("CodeUi");
  expect(tabB?.textContent).toContain("novel");
  // Secondary suffix uses tertiary text class.
  expect(tabA?.querySelector(".text-text-tertiary")?.textContent).toContain("CodeUi");
});

it("shows workspace separators and chips when ≥2 workspaces have session tabs", async () => {
  await render({
    tabs: [
      {
        key: "a1",
        label: "A1",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "a2",
        label: "A2",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "b1",
        label: "B1",
        streaming: false,
        workspacePath: "/ws/Beta",
        workspaceShortName: "Beta",
      },
    ],
  });

  const chips = [...node.querySelectorAll("[data-tab-workspace-chip]")].map(
    (el) => el.textContent,
  );
  expect(chips).toEqual(["Alpha", "Beta"]);
  const seps = [...node.querySelectorAll('[data-tab-group-separator="workspace"]')];
  expect(seps).toHaveLength(1);
  // Dom order: chip Alpha, a1, a2, sep, chip Beta, b1
  const keys = [...node.querySelectorAll("[data-tab-key]")].map(
    (el) => el.getAttribute("data-tab-key"),
  );
  expect(keys).toEqual(["a1", "a2", "b1"]);
});

it("omits group chrome for a single workspace", async () => {
  await render({
    tabs: [
      {
        key: "a1",
        label: "A1",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "a2",
        label: "A2",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
    ],
  });
  expect(node.querySelectorAll("[data-tab-workspace-chip]")).toHaveLength(0);
  expect(node.querySelectorAll("[data-tab-group-separator]")).toHaveLength(0);
});

it("keeps non-session tabs after session groups with a surface separator", async () => {
  await render({
    tabs: [
      {
        key: "a1",
        label: "A1",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "b1",
        label: "B1",
        streaming: false,
        workspacePath: "/ws/Beta",
        workspaceShortName: "Beta",
      },
      { key: "file:/tmp/x.md", label: "x.md", streaming: false },
    ],
  });
  const keys = [...node.querySelectorAll("[data-tab-key]")].map(
    (el) => el.getAttribute("data-tab-key"),
  );
  expect(keys).toEqual(["a1", "b1", "file:/tmp/x.md"]);
  expect(node.querySelectorAll('[data-tab-group-separator="surface"]')).toHaveLength(1);
  expect(node.querySelectorAll('[data-tab-group-separator="workspace"]')).toHaveLength(1);
});

it("renders pre-clustered multi-workspace tabs with chrome (no second cluster)", async () => {
  // Production path: useChatTabs clusters once; strip only partitions for chrome.
  // Store order [A1,B1,A2] arrives here already as [A1,A2,B1].
  await render({
    tabs: [
      {
        key: "a1",
        label: "A1",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "a2",
        label: "A2",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "b1",
        label: "B1",
        streaming: false,
        workspacePath: "/ws/Beta",
        workspaceShortName: "Beta",
      },
    ],
  });
  const keys = [...node.querySelectorAll("[data-tab-key]")].map(
    (el) => el.getAttribute("data-tab-key"),
  );
  expect(keys).toEqual(["a1", "a2", "b1"]);
  expect(
    [...node.querySelectorAll("[data-tab-workspace-chip]")].map((el) => el.textContent),
  ).toEqual(["Alpha", "Beta"]);
  expect(node.querySelectorAll('[data-tab-group-separator="workspace"]')).toHaveLength(1);
});

it("chip click selects the group's first session tab", async () => {
  const onSelect = vi.fn();
  await render({
    onSelect,
    tabs: [
      {
        key: "a1",
        label: "A1",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "a2",
        label: "A2",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "b1",
        label: "B1",
        streaming: false,
        workspacePath: "/ws/Beta",
        workspaceShortName: "Beta",
      },
      {
        key: "c1",
        label: "C1",
        streaming: false,
        workspacePath: "/ws/Gamma",
        workspaceShortName: "Gamma",
      },
      {
        key: "c2",
        label: "C2",
        streaming: false,
        workspacePath: "/ws/Gamma",
        workspaceShortName: "Gamma",
      },
    ],
  });

  const chips = [...node.querySelectorAll<HTMLButtonElement>("[data-tab-workspace-chip]")];
  expect(chips).toHaveLength(3);
  expect(chips.map((c) => c.getAttribute("data-tab-workspace-chip-target"))).toEqual([
    "a1",
    "b1",
    "c1",
  ]);

  await act(async () => chips[1].click());
  expect(onSelect).toHaveBeenCalledWith("b1");
  await act(async () => chips[2].click());
  expect(onSelect).toHaveBeenCalledWith("c1");
  await act(async () => chips[0].click());
  expect(onSelect).toHaveBeenCalledWith("a1");
});

it("workspace chips are buttons with accessible names", async () => {
  await render({
    tabs: [
      {
        key: "a1",
        label: "A1",
        streaming: false,
        workspacePath: "/ws/Alpha",
        workspaceShortName: "Alpha",
      },
      {
        key: "b1",
        label: "B1",
        streaming: false,
        workspacePath: "/ws/Beta",
        workspaceShortName: "Beta",
      },
    ],
  });

  const chips = [...node.querySelectorAll("[data-tab-workspace-chip]")];
  expect(chips).toHaveLength(2);
  for (const chip of chips) {
    expect(chip.tagName).toBe("BUTTON");
    expect(chip.getAttribute("type")).toBe("button");
    // Mock t returns the key; production interpolates {{name}}.
    expect(chip.getAttribute("aria-label")).toBe("chat.focusWorkspaceTabs");
    expect(chip.getAttribute("title")).toMatch(/Alpha|Beta/);
  }
});

it("renders batch close and split options on session tab right-click", async () => {
  const onCloseInactive = vi.fn();
  const onCloseLeft = vi.fn();
  const onCloseRight = vi.fn();
  const onCloseAll = vi.fn();

  await render({
    tabs: [
      { key: "s1", label: "Session 1", streaming: false, session: { engine: "claude", sessionId: "1", workspacePath: "/w" } },
      { key: "s2", label: "Session 2", streaming: false, session: { engine: "claude", sessionId: "2", workspacePath: "/w" } },
      { key: "s3", label: "Session 3", streaming: false, session: { engine: "claude", sessionId: "3", workspacePath: "/w" } },
    ],
    onCloseInactive,
    onCloseLeft,
    onCloseRight,
    onCloseAll,
  });

  // Right-click middle session tab s2
  const tab = node.querySelector<HTMLElement>('[data-tab-key="s2"]');
  if (!tab) throw new Error("tab s2 not found");

  await act(async () => {
    tab.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 12 }),
    );
  });

  expect(menuItems()).toEqual([
    "chat.closeInactiveTabs",
    "chat.closeLeftTabs",
    "chat.closeRightTabs",
    "chat.closeAllTabs",
    "chat.splitRight",
    "chat.splitDown",
  ]);

  const items = [...document.body.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  // Click close left
  await act(async () => items[1].click());
  expect(onCloseLeft).toHaveBeenCalledWith("s2");
});

it("renders file actions when right clicking a file tab", async () => {
  const onCloseAll = vi.fn();

  await render({
    tabs: [
      { key: "s1", label: "Session 1", streaming: false },
      { key: "file:/src/app.tsx", label: "app.tsx", title: "/src/app.tsx", streaming: false },
    ],
    onCloseAll,
    onCloseInactive: vi.fn(),
    onCloseLeft: vi.fn(),
    onCloseRight: vi.fn(),
  });

  const tab = node.querySelector<HTMLElement>('[data-tab-key="file:/src/app.tsx"]');
  if (!tab) throw new Error("file tab not found");

  await act(async () => {
    tab.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 120, clientY: 12 }),
    );
  });

  const items = menuItems();
  expect(items).toContain("files.copyPath");
  expect(items).toContain("files.sendPathToComposer");
  expect(items.some((label) => label.startsWith("files.revealIn"))).toBe(true);
});
