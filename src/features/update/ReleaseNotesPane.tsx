import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/utils/cx";
import { CHANGELOG_DATA, changelogEntryFor, type ChangelogEntry } from "@/version/changelog";
import { useReleaseNotesTabStore } from "./notes-tab";

/**
 * Resolve content to display. Shows both EN and ZH when both exist,
 * ordered by the active UI language (zh / zh-TW get Chinese first).
 */
function resolveChangelogContent(
  entry: ChangelogEntry,
  language?: string,
): { lang: "zh" | "en"; text: string }[] {
  const parts = [
    { lang: "zh" as const, text: entry.content.zh },
    { lang: "en" as const, text: entry.content.en },
  ].filter((part) => part.text);
  return (language ?? "").toLowerCase().startsWith("zh") ? parts : parts.reverse();
}

/** One release-notes markdown body from the local bilingual changelog. */
function ChangelogMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h4 className="pt-1 pb-1 text-body-medium text-text-primary">{children}</h4>
        ),
        p: ({ children }) => <p className="py-0.5 text-body-regular text-text-primary">{children}</p>,
        ul: ({ children }) => (
          <ul className="flex list-disc flex-col gap-1 py-1 pl-5 text-body-regular text-text-primary marker:text-text-tertiary">
            {children}
          </ul>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-text-primary">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="rounded-sm bg-background-tertiary-default px-1 py-0.5 font-mono text-[0.85em] text-text-primary">
            {children}
          </code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/** 本地版本记录里与 `version` 同名的条目；没有版本号（手动打开页签）时取最新
 *  一条。有版本号但没有对应条目时不回落到别的版本。 */
function localEntryFor(version?: string): ChangelogEntry | undefined {
  return version ? changelogEntryFor(version) : CHANGELOG_DATA[0];
}

/**
 * 版本说明页签（中心面，单实例）：读本地 CHANGELOG_DATA。
 *
 * 升级后首启（`upgrade-announcement.ts`）会宣布一次本地记录的版本说明，并在
 * 未读期间给页签圆点与页头的「新版本」标记。桌面远端「检查更新」已砍：此页
 * 不再提供检查 / 下载安装入口。
 */
function ReleaseHeader({
  displayVersion,
  displayDate,
  unread,
}: {
  displayVersion: string | undefined;
  displayDate: string | undefined;
  /** 升级后首启的未读标记：版本号旁挂「新版本」。 */
  unread: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-separator-border px-4">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="shrink-0 text-title-3-medium text-text-primary">{t("changelog.title")}</h1>
        {displayVersion && (
          <span className="shrink-0 rounded-full bg-background-tertiary-default px-2 py-0.5 text-caption-1-medium text-text-secondary">
            v{displayVersion}
          </span>
        )}
        {unread && (
          <span className="shrink-0 rounded-full bg-pill-tab-blue-selected-background px-2 py-0.5 text-caption-1-medium text-accent-500">
            {t("changelog.newVersion")}
          </span>
        )}
        {displayDate && (
          <span className="shrink-0 text-caption-1-regular text-text-tertiary">{displayDate}</span>
        )}
      </div>
    </div>
  );
}

/** Release-notes body: bilingual local entry, or the empty copy. */
function ReleaseBody({ parts }: { parts: { lang: "zh" | "en"; text: string }[] }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-4">
        {parts.length > 0 ? (
          parts.map((part, idx) => (
            <div
              key={part.lang}
              className={cx(idx > 0 && "border-t border-separator-border pt-3")}
            >
              <ChangelogMarkdown text={part.text} />
            </div>
          ))
        ) : (
          <p className="text-body-regular text-text-secondary">
            {t("settings.updateNotesEmpty")}
          </p>
        )}
      </div>
    </div>
  );
}

export function ReleaseNotesPane() {
  const { i18n } = useTranslation();
  const unreadVersion = useReleaseNotesTabStore((s) => s.unreadVersion);

  // 页签标题上的版本：优先升级后首启宣布的未读版本，否则本地最新条目（手动打开）。
  const local = useMemo(() => localEntryFor(unreadVersion), [unreadVersion]);
  const displayVersion = unreadVersion ?? local?.version;
  const displayDate = local?.date;
  const parts = local ? resolveChangelogContent(local, i18n.language) : [];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background-primary-default">
      <ReleaseHeader
        displayVersion={displayVersion}
        displayDate={displayDate}
        unread={unreadVersion !== undefined}
      />
      <ReleaseBody parts={parts} />
    </div>
  );
}
