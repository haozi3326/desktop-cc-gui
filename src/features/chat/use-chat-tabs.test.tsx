import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BROWSER_TAB_PREFIX, useBrowserStore } from "@/features/browser/store";
import {
  MISSION_WORKBENCH_TAB_KEY,
  resetMissionStore,
  useMissionStore,
} from "@/features/mission/store";
import { PLUGIN_HUB_TAB_KEY, usePluginHubStore } from "@/features/plugins/hub/store";
import { useBetaFeaturesStore } from "@/features/settings/beta-features";
import { RELEASE_NOTES_TAB_KEY, useReleaseNotesTabStore } from "@/features/update/notes-tab";
import i18n from "@/lib/i18n";
import { useChatStore } from "./store";
import { useChatTabs, workspaceShortNameForTab, type UseChatTabsResult } from "./use-chat-tabs";
import type { SessionMeta, Workspace } from "@/lib/ipc";
import type { SessionTabItem } from "./components/SessionTab";

/**
 * 内测入口（设置 → 其他 → 内测功能）的展示 gate：关闭时浏览器/任务工作台
 * 页签与中心面整体隐藏；开启（或中途切换）时立即出现。
 */

// React 18's act() requires this flag to be set by the test environment.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BROWSER_TAB = { id: "b1", url: "https://example.com", title: "Example" };

function Probe() {
  const {
    tabItems,
    activeTabKey,
    handleTabReorder,
    browserTabs,
    activeBrowserId,
    pluginHubOpen,
    pluginHubActive,
    missionOpen,
    missionActive,
    notesOpen,
    notesActive,
  } = useChatTabs({ setDialog: () => {} });
  // Expose reorder for cross-workspace ignore / same-workspace move tests.
  (globalThis as unknown as { __tabReorder?: typeof handleTabReorder }).__tabReorder =
    handleTabReorder;
  // 未读标记只挂在版本更新页签上；页签条按公共 SessionTabItem 渲染，这里也按它读。
  const notesTab: SessionTabItem | undefined = tabItems.find(
    (item) => item.key === RELEASE_NOTES_TAB_KEY,
  );
  const notesUnread = notesTab?.unread ?? "";
  const sessionBits = (tabItems as SessionTabItem[])
    .filter((item): item is SessionTabItem & { session: NonNullable<SessionTabItem["session"]> } =>
      !!item.session,
    )
    .map(
      (item) =>
        `${item.key}|${item.label}|${item.workspaceShortName ?? ""}|${item.title ?? ""}|s=${item.streaming ? 1 : 0}|u=${item.unseen ? 1 : 0}`,
    )
    .join(";");
  return (
    <div>
      <span data-testid="keys">{tabItems.map((item) => item.key).join(",")}</span>
      <span data-testid="session-bits">{sessionBits}</span>
      <span data-testid="active">{activeTabKey ?? ""}</span>
      <span data-testid="browser-count">{String(browserTabs.length)}</span>
      <span data-testid="browser-active">{activeBrowserId ?? ""}</span>
      <span data-testid="hub-open">{String(pluginHubOpen)}</span>
      <span data-testid="hub-active">{String(pluginHubActive)}</span>
      <span data-testid="mission-open">{String(missionOpen)}</span>
      <span data-testid="mission-active">{String(missionActive)}</span>
      <span data-testid="notes-open">{String(notesOpen)}</span>
      <span data-testid="notes-active">{String(notesActive)}</span>
      <span data-testid="notes-unread">{notesUnread}</span>
    </div>
  );
}

function text(id: string): string {
  return document.querySelector(`[data-testid="${id}"]`)?.textContent ?? "";
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  useChatStore.setState({
    active: null,
    openTabs: [],
    sessions: [],
    unseen: {},
    streamingByKey: {},
    workspaces: [],
    workspaceAliases: {},
  });
  useBrowserStore.setState({ tabs: [BROWSER_TAB], activeId: BROWSER_TAB.id });
  resetMissionStore();
  useMissionStore.setState({ open: true, active: true });
  usePluginHubStore.setState({ open: false, active: false, view: "market" });
  useReleaseNotesTabStore.setState({ open: false, active: false, unreadVersion: undefined });
  useBetaFeaturesStore.setState({ features: {} });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useBrowserStore.setState({ tabs: [], activeId: null });
  resetMissionStore();
  usePluginHubStore.setState({ open: false, active: false, view: "market" });
  useReleaseNotesTabStore.setState({ open: false, active: false });
});

function render() {
  act(() => root.render(<Probe />));
}

describe("useChatTabs beta entry gate", () => {
  it("hides browser and mission tabs while the beta entries are off", () => {
    render();
    expect(text("keys")).toBe("");
    expect(text("browser-count")).toBe("0");
    expect(text("browser-active")).toBe("");
    expect(text("mission-open")).toBe("false");
    expect(text("mission-active")).toBe("false");
    expect(text("active")).toBe("");
  });

  it("shows the browser tab once its switch is on and keeps the hidden mission entry off", () => {
    useBetaFeaturesStore.setState({
      features: { newBrowser: true, missionWorkbench: true },
    });
    render();
    // 任务工作台入口内测暂不放开（beta-features.ts 里已注释）：即使设置里
    // 存了 true，页签与中心面也不出现。恢复时把这里改回两个页签都出现。
    expect(text("keys")).toBe(`${BROWSER_TAB_PREFIX}b1`);
    expect(text("keys")).not.toContain(MISSION_WORKBENCH_TAB_KEY);
    expect(text("browser-count")).toBe("1");
    expect(text("browser-active")).toBe("b1");
    expect(text("mission-open")).toBe("false");
    expect(text("mission-active")).toBe("false");
    expect(text("active")).toBe(`${BROWSER_TAB_PREFIX}b1`);
  });

  it("reacts to a flag flip without remounting", () => {
    render();
    expect(text("keys")).toBe("");
    act(() => {
      useBetaFeaturesStore.setState({ features: { newBrowser: true } });
    });
    expect(text("keys")).toBe(`${BROWSER_TAB_PREFIX}b1`);
    act(() => {
      useBetaFeaturesStore.setState({ features: { newBrowser: false } });
    });
    expect(text("keys")).toBe("");
  });

  it("shows the plugin hub tab without any beta flag and routes the active key to it", () => {
    useMissionStore.setState({ open: true, active: false });
    act(() => {
      usePluginHubStore.setState({ open: true, active: true, view: "market" });
    });
    render();
    expect(text("keys")).toBe(PLUGIN_HUB_TAB_KEY);
    expect(text("hub-open")).toBe("true");
    expect(text("hub-active")).toBe("true");
    expect(text("active")).toBe(PLUGIN_HUB_TAB_KEY);
  });

  it("shows the auto-opened release-notes tab last and routes the active key to it", () => {
    // 更新检查发现新版本：页签自己挂在条尾，且不抢已在视的插件中心。
    usePluginHubStore.setState({ open: true, active: true, view: "market" });
    useReleaseNotesTabStore.setState({ open: true, active: true });
    render();
    expect(text("keys")).toBe(`${PLUGIN_HUB_TAB_KEY},${RELEASE_NOTES_TAB_KEY}`);
    expect(text("notes-open")).toBe("true");
    expect(text("notes-active")).toBe("true");
    expect(text("active")).toBe(PLUGIN_HUB_TAB_KEY);

    act(() => {
      usePluginHubStore.setState({ active: false });
    });
    expect(text("active")).toBe(RELEASE_NOTES_TAB_KEY);
  });

  it("marks the release-notes tab unread until the user closes it", () => {
    // 升级后首启（upgrade-announcement.ts）：页签带未读标记，关掉即已读。
    useReleaseNotesTabStore.getState().announceNewVersion("1.0.9");
    render();
    expect(text("notes-unread")).toBe(i18n.t("changelog.newVersion"));

    act(() => {
      useReleaseNotesTabStore.getState().close();
    });
    expect(text("notes-unread")).toBe("");
    expect(text("keys")).toBe("");
  });
});

describe("workspaceShortNameForTab", () => {
  const ws: Workspace[] = [
    { id: "w1", path: "/proj/CodeUi", name: "CodeUi", sortOrder: 0, groupId: null, lastOpenedAt: null },
    { id: "w2", path: "/proj/novel", name: "novel", sortOrder: 1, groupId: null, lastOpenedAt: null },
  ];

  it("prefers settings alias over folder name", () => {
    expect(workspaceShortNameForTab("/proj/CodeUi", ws, { w1: "支付后端" })).toBe("支付后端");
  });

  it("falls back to workspace name / path basename", () => {
    expect(workspaceShortNameForTab("/proj/CodeUi", ws, {})).toBe("CodeUi");
    expect(workspaceShortNameForTab("/orphan/OtherApp", [], {})).toBe("OtherApp");
  });

  it("returns undefined for empty path", () => {
    expect(workspaceShortNameForTab("", ws, {})).toBeUndefined();
  });
});

describe("useChatTabs session workspace labels", () => {
  const WS_A: Workspace = {
    id: "wa",
    path: "/ws/Alpha",
    name: "Alpha",
    sortOrder: 0,
    groupId: null,
    lastOpenedAt: null,
  };
  const WS_B: Workspace = {
    id: "wb",
    path: "/ws/Beta",
    name: "Beta",
    sortOrder: 1,
    groupId: null,
    lastOpenedAt: null,
  };
  const SESS_A: SessionMeta = {
    engine: "codex",
    sessionId: "sa",
    workspacePath: "/ws/Alpha",
    filePath: "/local/sa.jsonl",
    fileSize: 1,
    fileMtimeMs: 1,
    title: "Same Title",
    preview: "",
    createdAt: null,
    updatedAt: 1,
    messageCount: 1,
    pinned: false,
    customTitle: null,
  };
  const SESS_B: SessionMeta = {
    ...SESS_A,
    sessionId: "sb",
    workspacePath: "/ws/Beta",
    filePath: "/local/sb.jsonl",
  };

  it("tags session tabs with distinct workspace short names (alias or basename)", () => {
    useChatStore.setState({
      workspaces: [WS_A, WS_B],
      workspaceAliases: { wa: "项目甲" },
      sessions: [SESS_A, SESS_B],
      openTabs: [
        { engine: "codex", sessionId: "sa", workspacePath: "/ws/Alpha" },
        { engine: "codex", sessionId: "sb", workspacePath: "/ws/Beta" },
      ],
      active: { engine: "codex", sessionId: "sa", workspacePath: "/ws/Alpha" },
    });
    render();
    const bits = text("session-bits");
    expect(bits).toContain("codex/sa|Same Title|项目甲|Same Title · 项目甲|s=0|u=0");
    expect(bits).toContain("codex/sb|Same Title|Beta|Same Title · Beta|s=0|u=0");
  });

  it("keeps streaming / unseen flags on session tabs (label change does not touch process flags)", () => {
    useChatStore.setState({
      workspaces: [WS_A, WS_B],
      workspaceAliases: {},
      sessions: [SESS_A, SESS_B],
      openTabs: [
        { engine: "codex", sessionId: "sa", workspacePath: "/ws/Alpha" },
        { engine: "codex", sessionId: "sb", workspacePath: "/ws/Beta" },
      ],
      active: { engine: "codex", sessionId: "sb", workspacePath: "/ws/Beta" },
      streamingByKey: { "codex/sa": true },
      unseen: { "codex/sa": true },
    });
    render();
    expect(text("session-bits")).toContain("codex/sa|Same Title|Alpha|Same Title · Alpha|s=1|u=1");
    expect(text("session-bits")).toContain("codex/sb|Same Title|Beta|Same Title · Beta|s=0|u=0");
  });
});

describe("useChatTabs session workspace grouping", () => {
  const WS_A: Workspace = {
    id: "wa",
    path: "/ws/Alpha",
    name: "Alpha",
    sortOrder: 0,
    groupId: null,
    lastOpenedAt: null,
  };
  const WS_B: Workspace = {
    id: "wb",
    path: "/ws/Beta",
    name: "Beta",
    sortOrder: 1,
    groupId: null,
    lastOpenedAt: null,
  };
  const SESS_A1: SessionMeta = {
    engine: "codex",
    sessionId: "a1",
    workspacePath: "/ws/Alpha",
    filePath: "/local/a1.jsonl",
    fileSize: 1,
    fileMtimeMs: 1,
    title: "A1",
    preview: "",
    createdAt: null,
    updatedAt: 1,
    messageCount: 1,
    pinned: false,
    customTitle: null,
  };
  const SESS_A2: SessionMeta = { ...SESS_A1, sessionId: "a2", filePath: "/local/a2.jsonl", title: "A2" };
  const SESS_B1: SessionMeta = {
    ...SESS_A1,
    sessionId: "b1",
    workspacePath: "/ws/Beta",
    filePath: "/local/b1.jsonl",
    title: "B1",
  };

  function seedInterleaved() {
    useChatStore.setState({
      workspaces: [WS_A, WS_B],
      workspaceAliases: {},
      sessions: [SESS_A1, SESS_A2, SESS_B1],
      // store order A1, B1, A2 — display must cluster to A1, A2, B1
      openTabs: [
        { engine: "codex", sessionId: "a1", workspacePath: "/ws/Alpha" },
        { engine: "codex", sessionId: "b1", workspacePath: "/ws/Beta" },
        { engine: "codex", sessionId: "a2", workspacePath: "/ws/Alpha" },
      ],
      active: { engine: "codex", sessionId: "a1", workspacePath: "/ws/Alpha" },
    });
  }

  it("clusters session tabs by workspacePath for display without rewriting openTabs", () => {
    seedInterleaved();
    render();
    expect(text("keys").split(",").filter((k) => k.startsWith("codex/"))).toEqual([
      "codex/a1",
      "codex/a2",
      "codex/b1",
    ]);
    // Store order untouched.
    expect(useChatStore.getState().openTabs.map((t) => t.sessionId)).toEqual([
      "a1",
      "b1",
      "a2",
    ]);
  });

  it("keeps a single-workspace strip without reordering", () => {
    useChatStore.setState({
      workspaces: [WS_A],
      workspaceAliases: {},
      sessions: [SESS_A1, SESS_A2],
      openTabs: [
        { engine: "codex", sessionId: "a1", workspacePath: "/ws/Alpha" },
        { engine: "codex", sessionId: "a2", workspacePath: "/ws/Alpha" },
      ],
      active: { engine: "codex", sessionId: "a1", workspacePath: "/ws/Alpha" },
    });
    render();
    expect(text("keys")).toBe("codex/a1,codex/a2");
  });

  it("ignores cross-workspace session drops and allows same-workspace reorder", () => {
    seedInterleaved();
    render();
    const reorder = (globalThis as unknown as {
      __tabReorder: (a: string, b: string, before: boolean) => void;
    }).__tabReorder;

    // Cross-project: A2 onto B1 — ignored.
    act(() => reorder("codex/a2", "codex/b1", true));
    expect(useChatStore.getState().openTabs.map((t) => t.sessionId)).toEqual([
      "a1",
      "b1",
      "a2",
    ]);

    // Same project: A2 before A1 — store splice by index (not clustered rewrite).
    act(() => reorder("codex/a2", "codex/a1", true));
    expect(useChatStore.getState().openTabs.map((t) => t.sessionId)).toEqual([
      "a2",
      "a1",
      "b1",
    ]);
    expect(text("keys").split(",").filter((k) => k.startsWith("codex/"))).toEqual([
      "codex/a2",
      "codex/a1",
      "codex/b1",
    ]);
  });
});

describe("batch tab close handlers", () => {
  let handlersRef: { current: UseChatTabsResult | null } = { current: null };

  function HandlersProbe() {
    handlersRef.current = useChatTabs({ setDialog: () => {} });
    return null;
  }

  it("closes tabs to the left and to the right of target session tab", () => {
    useChatStore.setState({
      openTabs: [
        { engine: "claude", sessionId: "1", workspacePath: "/w" },
        { engine: "claude", sessionId: "2", workspacePath: "/w" },
        { engine: "claude", sessionId: "3", workspacePath: "/w" },
      ],
      active: { engine: "claude", sessionId: "2", workspacePath: "/w" },
    });

    act(() => root.render(<HandlersProbe />));
    expect(handlersRef.current?.tabItems.map((t) => t.key)).toEqual([
      "claude/1",
      "claude/2",
      "claude/3",
    ]);

    // Close tabs to the left of s2 -> s1 is closed
    act(() => {
      handlersRef.current?.handleTabCloseLeft("claude/2");
    });
    expect(useChatStore.getState().openTabs.map((t) => t.sessionId)).toEqual(["2", "3"]);

    // Close tabs to the right of s2 -> s3 is closed
    act(() => {
      handlersRef.current?.handleTabCloseRight("claude/2");
    });
    expect(useChatStore.getState().openTabs.map((t) => t.sessionId)).toEqual(["2"]);
  });

  it("close inactive preserves the specified target tab", () => {
    useChatStore.setState({
      openTabs: [
        { engine: "claude", sessionId: "1", workspacePath: "/w" },
        { engine: "claude", sessionId: "2", workspacePath: "/w" },
        { engine: "claude", sessionId: "3", workspacePath: "/w" },
      ],
      active: { engine: "claude", sessionId: "1", workspacePath: "/w" },
    });

    act(() => root.render(<HandlersProbe />));

    // Right-clicked s3 to close inactive (others) -> s3 is preserved even though active was s1
    act(() => {
      handlersRef.current?.handleTabCloseInactive("claude/3");
    });
    expect(useChatStore.getState().openTabs.map((t) => t.sessionId)).toEqual(["3"]);
  });
});
