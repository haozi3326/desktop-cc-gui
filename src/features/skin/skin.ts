import { fileUrl, pickFile } from "@/lib/platform";
import { readStoredJson } from "@/lib/storage";
import { builtinSkinById } from "./skin-catalog";
import { type SkinState, isWallpaperActive } from "./skin-types";

/** localStorage key; mirrored on boot by bootstrap.tsx before first paint. */
export const SKIN_STORAGE_KEY = "ccgui-next.skin:v1";
export const SKIN_CHANGE_EVENT = "ccgui:skin-change";

function validateSkin(value: unknown): SkinState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  if (kind === "default") return { kind: "default" };
  if (kind === "builtin" && typeof record.builtinId === "string" && record.builtinId) {
    return { kind: "builtin", builtinId: record.builtinId };
  }
  if (kind === "local" && typeof record.localPath === "string" && record.localPath) {
    return { kind: "local", localPath: record.localPath };
  }
  return null;
}

function loadSkinFromStorage(): SkinState {
  return readStoredJson(SKIN_STORAGE_KEY, validateSkin) ?? { kind: "default" };
}

/** Cached snapshot for useSyncExternalStore (must be referentially stable). */
let skinSnapshot: SkinState = loadSkinFromStorage();

function persistSkin(state: SkinState): void {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal: in-memory apply still works for this session.
  }
  skinSnapshot = state;
}

/** Resolve the CSS `url()` target for the current selection. */
export function resolveWallpaperUrl(state: SkinState): string | null {
  if (state.kind === "default") return null;
  if (state.kind === "builtin") {
    const skin = state.builtinId ? builtinSkinById(state.builtinId) : undefined;
    return skin?.wallpaper ?? null;
  }
  if (state.kind === "local" && state.localPath) {
    return fileUrl(state.localPath);
  }
  return null;
}

function syncDocumentWallpaper(state: SkinState): void {
  const url = resolveWallpaperUrl(state);
  const active = url != null;
  if (active) {
    document.documentElement.dataset.wallpaper = "active";
  } else {
    delete document.documentElement.dataset.wallpaper;
  }
}

/** Apply selection to the document and persist for the next launch. */
export function applySkin(state: SkinState): void {
  persistSkin(state);
  syncDocumentWallpaper(state);
  window.dispatchEvent(new CustomEvent<SkinState>(SKIN_CHANGE_EVENT, { detail: state }));
}

export function readSkinState(): SkinState {
  return skinSnapshot;
}

/** Boot-time read from bootstrap.tsx (before React paints). */
export function applyStoredSkin(): void {
  skinSnapshot = loadSkinFromStorage();
  syncDocumentWallpaper(skinSnapshot);
}

export function setSkinDefault(): void {
  applySkin({ kind: "default" });
}

export function setSkinBuiltin(builtinId: string): void {
  applySkin({ kind: "builtin", builtinId });
}

export function setSkinLocal(localPath: string): void {
  applySkin({ kind: "local", localPath });
}

export function subscribeSkin(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(SKIN_CHANGE_EVENT, handler);
  return () => window.removeEventListener(SKIN_CHANGE_EVENT, handler);
}

export function getSkinSnapshot(): SkinState {
  return skinSnapshot;
}

export function skinSelectionEquals(a: SkinState, b: SkinState): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "builtin") return a.builtinId === b.builtinId;
  if (a.kind === "local") return a.localPath === b.localPath;
  return true;
}

export function isSkinWallpaperActive(state: SkinState = readSkinState()): boolean {
  return isWallpaperActive(state) && resolveWallpaperUrl(state) != null;
}

const IMAGE_FILTERS = [
  { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] },
];

/** Native / web prompt file picker → one-shot apply. */
export async function pickAndApplyLocalWallpaper(dialogTitle: string): Promise<boolean> {
  const path = await pickFile(dialogTitle, IMAGE_FILTERS);
  if (!path) return false;
  setSkinLocal(path);
  return true;
}
