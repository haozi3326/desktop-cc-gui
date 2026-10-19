import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import i18n from "@/lib/i18n";
import { CHANGELOG_DATA } from "@/version/changelog";
import { ReleaseNotesPane } from "./ReleaseNotesPane";
import { useReleaseNotesTabStore } from "./notes-tab";

// React 18's act() requires this flag to be set by the test environment.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** The local changelog's newest entry, whose body the pane falls back to
 *  when opened manually (no upgrade announce). */
const newest = CHANGELOG_DATA[0];

/** First bolded title of the newest entry; asserting on this instead of a
 *  hard-coded phrase keeps the test valid across releases. */
const newestMarker = newest.content.zh.match(/\*\*(.+?)\*\*/)?.[1] ?? "";

describe("ReleaseNotesPane", () => {
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(() => {
    useReleaseNotesTabStore.setState({ open: true, active: true, unreadVersion: undefined });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
  });

  afterEach(async () => {
    if (root) {
      const current = root;
      await act(async () => current.unmount());
    }
    container.remove();
  });

  async function render() {
    const nextRoot = createRoot(container);
    root = nextRoot;
    await act(async () => {
      nextRoot.render(<ReleaseNotesPane />);
    });
  }

  function button(label: string): HTMLButtonElement | undefined {
    return [...container.querySelectorAll("button")].find(
      (element) => element.textContent?.trim() === label,
    );
  }

  /** 页头版本号旁的「新版本」胶囊：按元素精确匹配，不在正文里找这个词。 */
  function hasNewVersionPill(): boolean {
    const label = i18n.t("changelog.newVersion");
    return [...container.querySelectorAll("span")].some((el) => el.textContent === label);
  }

  it("falls back to the local version history when opened manually", async () => {
    await render();

    expect(container.textContent).toContain(`v${newest.version}`);
    expect(container.textContent).toContain(newestMarker);
    expect(hasNewVersionPill()).toBe(false);
    // 远端检查更新已砍：页头不再有检查 / 立即更新按钮。
    expect(button(i18n.t("settings.checkUpdates"))).toBeUndefined();
    expect(button("立即更新")).toBeUndefined();
  });

  it("announces the upgraded version from the local history with the 新版本 marker", async () => {
    const upgraded = CHANGELOG_DATA[1];
    const upgradedMarker = upgraded.content.zh.match(/\*\*(.+?)\*\*/)?.[1] ?? "";
    useReleaseNotesTabStore.setState({ open: true, active: true, unreadVersion: upgraded.version });
    await render();

    expect(container.textContent).toContain(`v${upgraded.version}`);
    expect(container.textContent).toContain(upgradedMarker);
    expect(hasNewVersionPill()).toBe(true);
    expect(container.textContent).not.toContain(newestMarker);
    expect(button("立即更新")).toBeUndefined();
    expect(button(i18n.t("settings.checkUpdates"))).toBeUndefined();
  });

  it("says so instead of borrowing another version's notes", async () => {
    const unknown = "9.9.9";
    useReleaseNotesTabStore.setState({ open: true, active: true, unreadVersion: unknown });
    await render();

    expect(container.textContent).toContain(`v${unknown}`);
    expect(container.textContent).toContain("这个版本没有附带更新说明。");
    expect(container.textContent).not.toContain(newestMarker);
  });
});
