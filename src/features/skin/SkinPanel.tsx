import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import Image from "lucide-react/dist/esm/icons/image";
import { ModalShell } from "@/components/dialogs";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { BUILTIN_SKINS } from "./skin-catalog";
import {
  getSkinSnapshot,
  pickAndApplyLocalWallpaper,
  setSkinBuiltin,
  setSkinDefault,
  skinSelectionEquals,
  subscribeSkin,
} from "./skin";
import type { SkinState } from "./skin-types";

function SkinTile({
  label,
  previewUrl,
  selected,
  onSelect,
}: {
  label: string;
  previewUrl?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "flex flex-col gap-2 rounded-2lg border p-2 text-left transition-colors",
        selected
          ? "border-accent-500 bg-background-secondary-hover shadow-nav-selected"
          : "border-border-button-default bg-background-primary-default hover:bg-background-primary-hover",
      )}
    >
      <div
        className={cx(
          "aspect-[16/10] w-full overflow-hidden rounded-lg bg-background-tertiary-default",
          previewUrl ? "bg-cover bg-center" : "flex items-center justify-center",
        )}
        style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
      >
        {!previewUrl && (
          <span className="text-caption-1-medium text-text-tertiary">{label}</span>
        )}
      </div>
      <span className="text-body-2-medium text-text-primary">{label}</span>
    </button>
  );
}

function isSelected(state: SkinState, next: SkinState): boolean {
  return skinSelectionEquals(state, next);
}

/**
 * Independent「换肤」panel: one click applies and persists (no try-on step).
 */
export function SkinPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    subscribeSkin,
    getSkinSnapshot,
    () => ({ kind: "default" as const }),
  );

  if (!open) return null;

  return (
    <ModalShell
      onClose={onClose}
      label={t("skin.title")}
      className="flex max-h-[85vh] w-[min(28rem,calc(100vw-2rem))] flex-col p-0"
      dialogClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b border-separator-border px-5 pb-3 pt-4">
        <h2 className="text-title-2-medium text-text-primary">{t("skin.title")}</h2>
        <p className="mt-0.5 text-body-2-regular text-text-secondary">{t("skin.description")}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <SkinTile
            label={t("skin.officialDefault")}
            selected={isSelected(state, { kind: "default" })}
            onSelect={() => {
              setSkinDefault();
              onClose();
            }}
          />
          {BUILTIN_SKINS.map((skin) => (
            <SkinTile
              key={skin.id}
              label={t(skin.nameKey)}
              previewUrl={skin.wallpaper}
              selected={isSelected(state, { kind: "builtin", builtinId: skin.id })}
              onSelect={() => {
                setSkinBuiltin(skin.id);
                onClose();
              }}
            />
          ))}
        </div>
        <div className="mt-4">
          <Button
            variant="secondary"
            leadingIcon={Image}
            className="w-full justify-center"
            onClick={() => {
              void pickAndApplyLocalWallpaper(t("skin.pickLocalTitle")).then((picked) => {
                if (picked) onClose();
              });
            }}
          >
            {t("skin.pickLocal")}
          </Button>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-separator-border px-5 py-3">
        <Button variant="secondary" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            setSkinDefault();
            onClose();
          }}
        >
          {t("skin.resetOfficial")}
        </Button>
      </div>
    </ModalShell>
  );
}
