# 手扶拖拉机：流式会话对齐与空回复体验（2026-10）

> 产品分支：**`push-gitee`**（Gitee `origin/main`）。勿以 GitHub fork `main` / CC GUI tip 为默认基线。

## 背景

Claude Code 等引擎可能在 **stdout 已结束** 后仍向 **会话 jsonl** 追加工具行与助手正文。若前端在 `done` 后丢弃同 run 的迟到事件，或只轮询一次历史，界面会出现「只有少量 Bash、无可见回复」，而转录本完整。

## 必要修复（本批）

| # | 项 | 实现要点 |
|---|---|---|
| 1 | `done` 后仍收同 run 的 tool 事件 | `engine-events.ts`：`isLateToolBodyEvent`，与 late assistant 同 gate |
| 2 | 对账多轮询 | `refreshSessionTurnBody`：8×300ms，`reconcileSessionTurnFromHistory` + `reconcileAssistantTailFromHistory` |
| 3 | 收窄 `--add-dir` | Rust `filter_whole_home_additional_dirs`；设置页对整棵 home 授权提示 |

## 体验增强（本批）

| # | 项 | 说明 |
|---|---|---|
| 4 | 空盒子文案 | 本回合有工具、无正文时：`noVisibleReplyTranscriptPending` |
| 5 | 空回复 CTA | 「继续 / 说明刚才做了什么」——用户点击才发送，不自动对账 |
| 6 | 工具前长文必显 | **未用真实会话 jsonl 证伪前不改** `MessageTimeline` / `timeline-rows` 折叠顺序 |
| 7 | 回合状态 | `transcriptReconcilePhase`（syncing / synced）+ `turnEndStatus.reconciledFromTranscript` |
| 8 | 宿主日志 | `[claude-transcript] session_id=… jsonl=…`（无对话正文） |

## 明确不做

- 会话摘要、代 compact、Claude 用量提醒
- 整包 merge GitHub fork（如 PR #17 / #9 所在线）

## 给 AI / 机器人的基线钉选

| 错误基线 | 说明 |
|---|---|
| GitHub fork `main` @ `dc102f2db`、`5136c131` 等 | CC GUI 备份 / Win CI 线，品牌与发版策略与手扶不同 |
| **正确产品 tip** | Gitee `origin/main`，本地 **`push-gitee`**（对照时 `git rev-parse HEAD`，示例 **`b385ac415`**） |

读代码、写方案、cherry-pick 前：先 `git branch --show-current` 与 `docs/ccgui-upstream-track.md`；禁止把 fork tip 写成「当前手扶版本」。

## 验证

```bash
pnpm exec vitest run src/features/chat/store/late-assistant-snapshot.test.ts
pnpm exec vitest run src/features/chat/components/MessageTimeline.test.tsx
pnpm build
# Rust（可选）
cd src-tauri && cargo test filter_whole_home -- --nocapture
```
