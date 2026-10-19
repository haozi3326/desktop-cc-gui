/**
 * Composer codepoint helpers for the "arrow → tofu" knife.
 *
 * Inter Variable latin ships ↑↓ (U+2191/U+2193) but not ←→ (U+2190/U+2192).
 * On zh-Hans macOS, `system-ui` often resolves to PingFang, which also lacks
 * those arrows — so a U+2192 that lands in the contentEditable paints as a
 * narrow .notdef tofu. Dump helpers lock the diagnosis in tests / handin.
 */

/** Arrow / box-drawing-ish symbols that Inter latin does not cover. */
export const COMPOSER_MISSING_IN_INTER_RE = /[\u2190\u2192\u2194-\u21FF]/;

/** Navigation keys whose default must stay caret-only (never insertText). */
export const COMPOSER_NAV_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export type CodepointDump = {
  length: number;
  /** Unique code points as U+XXXX. */
  unique: string[];
  /** How many times each listed code point appears. */
  counts: Record<string, number>;
  /** True when any code point is in COMPOSER_MISSING_IN_INTER_RE. */
  hasInterMissingSymbol: boolean;
};

function fmtCp(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Dump code points of a string (composer textContent / extractText). */
export function dumpCodepoints(text: string): CodepointDump {
  const counts: Record<string, number> = {};
  let hasInterMissingSymbol = false;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const key = fmtCp(cp);
    counts[key] = (counts[key] ?? 0) + 1;
    if (COMPOSER_MISSING_IN_INTER_RE.test(ch)) hasInterMissingSymbol = true;
  }
  return {
    length: [...text].length,
    unique: Object.keys(counts).sort(),
    counts,
    hasInterMissingSymbol,
  };
}

/**
 * True when a beforeinput insertText should be dropped because it was
 * triggered by a navigation key (WebKit / IME quirk path).
 */
export function shouldBlockNavInsert(
  lastKey: string | null | undefined,
  inputType: string,
  data: string | null,
): boolean {
  if (!lastKey || !COMPOSER_NAV_KEYS.has(lastKey)) return false;
  if (inputType !== "insertText") return false;
  // Any insertText paired with a nav key is wrong; also catch arrow payloads.
  return data == null || data.length > 0;
}
