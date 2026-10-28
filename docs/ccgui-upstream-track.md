# 手扶拖拉机 ↔ CC GUI 上游对照

> 用途：借鉴 / 挑选上游功能、发版、装机前必读本表，**避免把 GitHub fork 线当成产品 tip**（混包、错图标、错「检查更新」）。  
> 维护：每次对照上游、合入切片或发版后更新「对照快照」；整包 merge 禁止，合入须可追溯到 commit/文件。

## 仓库与分支（硬规矩）

| 角色 | 远程 | 说明 |
|---|---|---|
| **产品 `origin`** | https://gitee.com/hao_zi/CodeUi.git | **手扶拖拉机**唯一产品源码与发版基线 |
| 上游 `upstream` | https://github.com/zhukunpenglinyutong/desktop-cc-gui.git | CC GUI 开源仓 |
| fork（备份/CI） | https://github.com/haozi3326/desktop-cc-gui.git | Windows CI、个人备份；**默认不等于产品 tip** |

| 本地分支 | 跟踪 | 用途 |
|---|---|---|
| **`push-gitee`** | `origin/main` | **日常开发与 macOS 装机打包** |
| `main` | 常对齐 `fork/main` | 仅在上游/sync 或 CI 调试时使用；**装机前必须核对 `tauri.conf.json` → `productName` 为「手扶拖拉机」** |

**禁止**：在未核对品牌与版本的情况下 `git reset --hard fork/main` 后直接 `tauri build` 覆盖 `/Applications/手扶拖拉机.app`。

### 给 Cursor / 外部 AI 的 tip 钉选（易错）

| 来源 | 示例 commit | 能否当手扶默认基线 |
|---|---|---|
| Gitee `origin/main` / 本地 **`push-gitee`** | `b385ac415`（随发版更新） | **是** |
| GitHub **fork** `main`（CC GUI） | `dc102f2db`、`5136c131` 等 | **否** — 备份与 Win CI，品牌为 CC GUI |

机器人写「当前版本 / 对照 diff / 合入建议」时，必须先确认分支为 **`push-gitee`** 且 remote 产品为 Gitee；勿把 fork tip 写成手扶 tip。流式空回复与对账策略见 **`docs/hand-tractor-stream-accuracy.md`**。

## 发版 / 装机检查清单

1. `git checkout push-gitee && git pull origin main`（或确认在已批准的产品 tip 上）。
2. 打开 `src-tauri/tauri.conf.json`：`productName` === **手扶拖拉机**，`version` 与 `package.json` / `src-tauri/Cargo.toml` 一致。
3. 确认产品策略：手扶侧**无**桌面远程「检查更新」模块时，不应出现 CC GUI 的 UpdateSection / updater 依赖。
4. `pnpm build` → `pnpm exec tauri build --bundles app`（签名 key 缺失可 ad-hoc，以产物 `.app` 内 Info.plist 为准）。
5. 替换 Applications：用 `scripts/install-macos-hand-tractor.sh`（**不保留**旧包备份；勿在 `/Applications` 下手动留 `.app.bak-*`）。安装后核对 `CFBundleIdentifier` 为 **`com.hao.hand-tractor`**、图标为拖拉机。
6. **Windows 安装包**：走 GitHub fork CI，Gitee 不提供 Win 产物（见仓库 CI 说明）。
7. 用户可见版本说明：同步 `src/version/changelog.ts` 的 `CHANGELOG_DATA`（应用内版本弹窗数据源）。

## 对照快照（2026-10-27 Asia/Shanghai）

| 项 | 值 |
|---|---|
| 产品工作分支 | `push-gitee` @ `origin/main` 线 |
| 产品 tip（示例） | **`b385ac415`** |
| fork 误用 tip（勿钉） | `dc102f2db`、`5136c131`（GitHub fork / CC GUI） |
| 本批目标版本 | **1.1.7**（手扶品牌） |
| 上游已发布标签 | **v1.1.7**（2026-10-26） |
| 与上游分叉点 | `cc561dbb8`（v1.1.4 附近） |

### 本批已合入（相对手扶 1.1.5 → 1.1.7）

| 来源 | 内容 |
|---|---|
| 手扶自研 | Claude jsonl tail + 禁止 Claude 线 synthetic done；前端 `reconcileSessionTurnFromHistory` |
| CC GUI v1.1.7 切片 | `files.rs` grant / `canonicalize_lenient`（含 `..` 拒绝）；`web/dispatch.rs` plugin storage 写 |

### v1.1.7 上游大特性（**未**整包合入，待另纸挑选）

自上游 release / changelog：CodeBuddy CLI 引擎、韩语界面、侧栏多选工作区、git_workspace_owners、terminal_host_info 等（约 102 文件）。需 `git fetch upstream --tags` 或 tarball 可用后按文件/cherry-pick 合入，并跑 `pnpm plugin-skill:docs`（若动 plugin-sdk）。

### 仍推荐从 v1.1.6 挑选（历史清单）

| 项 | 建议 |
|---|---|
| 页签右键增强（关左/关右、分屏、复制路径） | 推荐 |
| 状态栏分支可搜 + 行内全名 | 推荐 |
| 后台任务续答 / `--resume` 回退 | 推荐 |
| 百度统计 | **砍** |

## 借鉴用法（给工程）

1. `git fetch upstream --tags`（或 `gh api` 读单文件 diff，网络受限时）。
2. 钉 **verify tip**：产品 commit；**baseline**：上游 tag 或 commit。
3. `git log --oneline <产品tip>..<上游目标>` 或对单文件 `git diff <产品tip>..<上游目标> -- path`。
4. **禁止** `git merge upstream/main` / `fork/main` 整包；只 cherry-pick / 手工移植批准切片。
5. 合入后更新本文件「对照快照」与「已合入 / 待挑选」表；发版则更新 `CHANGELOG_DATA`。

## 曾出问题的根因（备忘）

- 本地 `main` 对齐 **fork**（CC GUI 品牌 1.1.6）上打包并 ditto 到「手扶拖拉机.app」→ 图标与更新入口错乱。
- Claude 会话 **stdout 早 EOF** + 前端 **settledRunIds 丢弃工具事件** → UI 停在少量 Bash、显示无可见回复；本批引擎+前端 tail 对齐修复。
