/**
 * Display-only helpers for assistant body chrome. Prompt headers like
 * `[模型：coding-claude]` / `[模式：需求澄清]` are written into the reply
 * text by system prompts; they must never override the real model stamped
 * on `message.model`. Stripping here only affects what Markdown renders —
 * stored history and copy still see the original text.
 */

const LEADING_BRACKET_RUN = /^((?:\s*\[[^\]]*\])+)/;

/** Drop leading `[模型：…]` / `[模式：…]` tags (ASCII or fullwidth colon). */
export function stripLeadingModelModeTags(text: string): string {
  const match = text.match(LEADING_BRACKET_RUN);
  if (!match) return text;
  const filtered = match[1].replace(/\s*\[\s*(模型|模式)\s*[：:][^\]]*\]/g, "");
  if (filtered === match[1]) return text;
  const rest = text.slice(match[0].length);
  // If every leading tag was a model/mode header, also trim the blank line
  // that usually follows the header block.
  if (!filtered.trim()) return rest.replace(/^\s*\n+/, "");
  return filtered + rest;
}
