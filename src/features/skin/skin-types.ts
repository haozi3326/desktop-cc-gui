/** Persisted wallpaper / skin selection (one-shot apply, no preview step). */
export type SkinKind = "default" | "builtin" | "local";

export interface SkinState {
  kind: SkinKind;
  /** Set when `kind === "builtin"`. */
  builtinId?: string;
  /** Absolute path when `kind === "local"`. */
  localPath?: string;
}

export function isWallpaperActive(state: SkinState): boolean {
  return state.kind !== "default";
}
