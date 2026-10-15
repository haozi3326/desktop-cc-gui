import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";
import {
  DIFF_PAGE_SIZE,
  FileDiffViewer,
  ToolPayloadViewer,
  diffPageWindow,
} from "./ToolPayloadViewer";

vi.mock("@/lib/clipboard", () => ({
  copyText: vi.fn(async () => true),
}));

import { copyText } from "@/lib/clipboard";

const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await i18n.changeLanguage("zh");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(copyText).mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderNode(node: ReactNode) {
  await act(async () => {
    root.render(node);
  });
}

function diffRows(): NodeListOf<Element> {
  return container.querySelectorAll("[data-diff-line]");
}

describe("diffPageWindow", () => {
  it("keeps a single page for short diffs", () => {
    expect(diffPageWindow(40, 0)).toEqual({ start: 0, end: 40, lastPage: 0, page: 0 });
  });

  it("pages a 1000-line diff into fixed windows", () => {
    const first = diffPageWindow(1000, 0);
    expect(first).toEqual({
      start: 0,
      end: DIFF_PAGE_SIZE,
      lastPage: Math.ceil(1000 / DIFF_PAGE_SIZE) - 1,
      page: 0,
    });
    const mid = diffPageWindow(1000, 3);
    expect(mid.end - mid.start).toBeLessThanOrEqual(DIFF_PAGE_SIZE);
    expect(mid.start).toBe(3 * DIFF_PAGE_SIZE);
    const last = diffPageWindow(1000, 99);
    expect(last.page).toBe(last.lastPage);
    expect(last.end).toBe(1000);
    expect(last.end - last.start).toBeLessThanOrEqual(DIFF_PAGE_SIZE);
  });
});

describe("FileDiffViewer bounded pages", () => {
  it("mounts at most DIFF_PAGE_SIZE rows for a 1000-line content write", async () => {
    const content = Array.from({ length: 1000 }, (_, i) => `line-${i}`).join("\n");
    await renderNode(<FileDiffViewer filePath="src/big.ts" content={content} />);

    expect(diffRows().length).toBe(DIFF_PAGE_SIZE);
    expect(diffRows().length).toBeLessThan(1000);
    expect(container.textContent).toContain("line-0");
    expect(container.textContent).toContain(`1–${DIFF_PAGE_SIZE}`);
    expect(container.textContent).toContain("共 1000 行");
    expect(container.textContent).toContain(`还有 ${1000 - DIFF_PAGE_SIZE} 行`);
  });

  it("pages forward so later changed lines become visible without growing DOM", async () => {
    const content = Array.from({ length: 1000 }, (_, i) => `line-${i}`).join("\n");
    await renderNode(<FileDiffViewer filePath="src/big.ts" content={content} />);

    const more = [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes("还有"),
    );
    expect(more).toBeTruthy();
    await act(async () => more!.click());

    expect(diffRows().length).toBe(DIFF_PAGE_SIZE);
    expect(container.textContent).toContain(`line-${DIFF_PAGE_SIZE}`);
    expect(container.textContent).not.toContain("line-0");
    expect(container.textContent).toContain(`${DIFF_PAGE_SIZE + 1}–${DIFF_PAGE_SIZE * 2}`);
  });

  it("copies the full source even when only one page is mounted", async () => {
    const content = Array.from({ length: 1000 }, (_, i) => `line-${i}`).join("\n");
    await renderNode(<FileDiffViewer filePath="src/big.ts" content={content} />);

    const copyBtn = container.querySelector<HTMLButtonElement>('button[aria-label="复制"]');
    expect(copyBtn).toBeTruthy();
    await act(async () => copyBtn!.click());
    expect(copyText).toHaveBeenCalledWith(content);
  });

  it("renders a small diff with no pagination chrome", async () => {
    await renderNode(
      <FileDiffViewer
        filePath="src/tiny.ts"
        oldString={"a\nb"}
        newString={"a\nc"}
      />,
    );
    expect(container.querySelector('[aria-label="差异分页"]')).toBeNull();
    expect(diffRows().length).toBeGreaterThan(0);
    expect(diffRows().length).toBeLessThan(DIFF_PAGE_SIZE);
    expect(container.textContent).toContain("+");
    expect(container.textContent).toContain("c");
    expect(container.textContent).toContain("-");
    expect(container.textContent).toContain("b");
  });

  it("shows empty state without page chrome", async () => {
    await renderNode(<FileDiffViewer filePath="src/empty.ts" />);
    expect(container.textContent).toContain("无修改内容");
    expect(diffRows().length).toBe(0);
    expect(container.querySelector('[aria-label="差异分页"]')).toBeNull();
  });
});

describe("ToolPayloadViewer dispatch", () => {
  it("keeps bash / non-edit payloads on the terminal viewer", async () => {
    await renderNode(
      <ToolPayloadViewer
        toolName="Bash"
        args={{ command: "echo hi", description: "say hi" }}
        result={{ stdout: "hi\n", stderr: "" }}
      />,
    );
    expect(container.querySelector("[data-diff-line]")).toBeNull();
    expect(container.querySelector("[data-diff-body]")).toBeNull();
    expect(container.textContent).toContain("echo hi");
    expect(container.textContent).toContain("hi");
  });

  it("routes edit tools through the bounded FileDiffViewer", async () => {
    const newString = Array.from({ length: 1000 }, (_, i) => `n${i}`).join("\n");
    await renderNode(
      <ToolPayloadViewer
        toolName="Edit"
        path="src/x.ts"
        args={{ file_path: "src/x.ts", old_string: "", new_string: newString }}
      />,
    );
    expect(diffRows().length).toBe(DIFF_PAGE_SIZE);
    expect(container.textContent).toContain("src/x.ts");
  });
});
