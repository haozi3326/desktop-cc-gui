import { fileUrl, pickFile } from "@/lib/platform";
import { readStoredJson } from "@/lib/storage";
import { builtinSkinById } from "./skin-catalog";
import { type SkinState, isWallpaperActive } from "./skin-types";

/** localStorage key; mirrored on boot by bootstrap.tsx before first paint. */
export const SKIN_STORAGE_KEY = "ccgui-next.skin:v1";
export const SKIN_CHANGE_EVENT = "ccgui:skin-change";

export const WALLPAPER_CHROME_OPACITY_DEFAULT = 52;
export const WALLPAPER_CHROME_OPACITY_MIN = 15;
export const WALLPAPER_CHROME_OPACITY_MAX = 85;

export function normalizeWallpaperChromeOpacity(value: unknown): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : WALLPAPER_CHROME_OPACITY_DEFAULT;
  return Math.min(
    WALLPAPER_CHROME_OPACITY_MAX,
    Math.max(WALLPAPER_CHROME_OPACITY_MIN, n),
  );
}

function validateSkin(value: unknown): SkinState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  const chromeOpacity =
    record.chromeOpacity !== undefined
      ? normalizeWallpaperChromeOpacity(record.chromeOpacity)
      : undefined;
  if (kind === "default") return { kind: "default" };
  if (kind === "builtin" && typeof record.builtinId === "string" && record.builtinId) {
    return { kind: "builtin", builtinId: record.builtinId, chromeOpacity };
  }
  if (kind === "local" && typeof record.localPath === "string" && record.localPath) {
    return { kind: "local", localPath: record.localPath, chromeOpacity };
  }
  return null;
}

function normalizeSkinState(state: SkinState): SkinState {
  if (state.kind === "default") return { kind: "default" };
  const chromeOpacity = normalizeWallpaperChromeOpacity(
    state.chromeOpacity ?? skinSnapshot.chromeOpacity,
  );
  if (state.kind === "builtin") {
    return { kind: "builtin", builtinId: state.builtinId, chromeOpacity };
  }
  return { kind: "local", localPath: state.localPath, chromeOpacity };
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

function syncDocumentChromeMix(state: SkinState): void {
  const root = document.documentElement;
  if (!isWallpaperActive(state) || resolveWallpaperUrl(state) == null) {
    root.style.removeProperty("--wallpaper-chrome-mix");
    return;
  }
  const mix = normalizeWallpaperChromeOpacity(state.chromeOpacity);
  root.style.setProperty("--wallpaper-chrome-mix", `${mix}%`);
}

/** Apply selection to the document and persist for the next launch. */
export function applySkin(state: SkinState): void {
  const normalized = normalizeSkinState(state);
  persistSkin(normalized);
  syncDocumentWallpaper(normalized);
  syncDocumentChromeMix(normalized);
  window.dispatchEvent(new CustomEvent<SkinState>(SKIN_CHANGE_EVENT, { detail: normalized }));
}

export function readSkinState(): SkinState {
  return skinSnapshot;
}

/** Boot-time read from bootstrap.tsx (before React paints). */
export function applyStoredSkin(): void {
  skinSnapshot = normalizeSkinState(loadSkinFromStorage());
  syncDocumentWallpaper(skinSnapshot);
  syncDocumentChromeMix(skinSnapshot);
}

export function setWallpaperChromeOpacity(opacity: number): void {
  const current = readSkinState();
  if (current.kind === "default") return;
  applySkin({ ...current, chromeOpacity: opacity });
}

export function readWallpaperChromeOpacity(state: SkinState = readSkinState()): number {
  if (state.kind === "default") return WALLPAPER_CHROME_OPACITY_DEFAULT;
  return normalizeWallpaperChromeOpacity(state.chromeOpacity);
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
