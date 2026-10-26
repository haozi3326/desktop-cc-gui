/** Persisted wallpaper / skin selection (one-shot apply, no preview step). */
export type SkinKind = "default" | "builtin" | "local";

export interface SkinState {
  kind: SkinKind;
  /** Set when `kind === "builtin"`. */
  builtinId?: string;
  /** Absolute path when `kind === "local"`. */
  localPath?: string;
  /** color-mix percentage for unified wallpaper chrome (15–85, default 52). */
  chromeOpacity?: number;
}

export function isWallpaperActive(state: SkinState): boolean {
  return state.kind !== "default";
}
