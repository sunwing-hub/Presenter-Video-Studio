# WorkBuddy 本地接入与制作

本包需要 WorkBuddy 能读取本机文件、执行命令、启动本机浏览器子进程并访问本机网页。Skill 是制作规则，工作台是独立运行程序；两者都要准备。无需部署云服务器、数据库或额外 MCP 服务。纯远程执行环境不能直接访问另一台电脑的 localhost。

## 1. 下载和定位

从 [正式发布页](https://github.com/sunwing-hub/Presenter-Video-Studio/releases/tag/v2026.11.18) 下载 `Presenter-Video-Studio-2026.11.18.zip`，完整解压到长期保留的文件夹，不在压缩包内运行。根目录包含 `package.json`、`scripts/studio-launcher.mjs`、`templates/`。目录名可以含中文与空格。

将这个文件夹加入 WorkBuddy 可访问的工作空间。下面命令均在该目录执行；也可以用绝对路径调用脚本，脚本会自行定位根目录。不假设作者路径，也不将 5174、5187 等历史端口写死。

## 2. 安装与标准

准备 Node.js >=22.18，建议 Node.js 24。运行 `node scripts/preferences.mjs status`。已有配置直接沿用；没有配置时，助手先询问用户采用默认还是自定标准，等待明确回复。用户选择默认后执行 `node scripts/preferences.mjs defaults`；自定则将设置写入 JSON，再执行 `node scripts/preferences.mjs custom 标准.json`。有自己的既有规则时按其保存，不反复要求选择发行默认。

随后运行：

```sh
npm run setup
```

安装器按锁文件和指定 pnpm 版本安装依赖、FFmpeg、Chromium，构建工作台并检查可用性。非交互安装遇到未确认标准会停止，不会代选。联网失败可以重试，不能因此删掉用户配置。

## 3. 启动、检查和停止

助手会话推荐后台启动，避免终端任务结束导致工作台停止：

```sh
npm run service:start
npm run service:status
```

直接调用 `node scripts/studio-service.mjs start/status/stop` 可获得不带 npm 提示的 JSON。`ready` 才表示当前安装目录的实例可用；输出包含实际根目录、地址、进程与日志路径。信息只留在本机 `user-data/runtime.json`，供同目录的工程、导出脚本自动读取。服务日志在 `user-data/service.log`。

默认端口 5173；端口上是另一目录的工作台时拒绝连接，不能把对方的素材编号拿来出片。需要换端口时：

```sh
# macOS / Linux
OVERLAY_STUDIO_PORT=5174 node scripts/studio-service.mjs start
```

```powershell
# Windows PowerShell
$env:OVERLAY_STUDIO_PORT="5174"
node scripts/studio-service.mjs start
```

浏览器打开返回的 origin。普通用户仍可用 `npm start` 或双击“启动工作台”前台运行，此时保持窗口打开。后台停止用 `npm run service:stop`；只停止同目录且由后台入口记录的进程，前台启动请在原窗口 Ctrl+C。电脑重启后重新启动，不安装开机驻留服务。

显式 `STUDIO_ORIGIN` 优先，其次端口环境变量，再读取本目录的后台连接记录。复制/升级目录后旧记录自动失效，应重新启动。

## 4. 导入规则与建立原生工程

将 `skills/overlay-studio-editor` 文件夹作为本地技能导入；客户端需要 ZIP 时可下载仓库 `downloads/overlay-studio-editor-skill.zip`。未启用技能导入时，明确让助手先读取其中的 `SKILL.md`。不修改客户端内部配置文件。

```sh
node scripts/studio-cli.mjs env-check
node scripts/studio-cli.mjs list-templates --json
node scripts/studio-cli.mjs read-spec team.scene-narration --version 0.2.1-native --json
node scripts/studio-project.mjs new team.scene-narration 0.2.1-native work/本期工程.json
```

最后一条通过工作台建立独立草稿并保存本地工程。它是**带示例内容的起始工程**，不会自动理解口播或替换素材。助手必须根据真实视频、SRT和已确认分镜，替换文案、媒体和时间，落实速度、字幕、BGM和音效标准；不得把演示成片冒充本期成片。其他模板ID/版本以目录输出为准。

编辑 JSON 后保存回工作台：

```sh
node scripts/studio-project.mjs save work/本期工程.json
```

保留工程 `id`、`revision` 可继续修订；并发版本冲突会拒绝覆盖。需要另建版本时使用新的文件并清除草稿 id/revision。真实媒体导入与时间编排接口见对应脚本和模板规范，不猜参数、不沿用作者私有文件。浏览器草稿列表可打开工程预览。

## 5. 检查与导出

```sh
node scripts/render-studio-project.mjs work/本期工程.json output/本期-v1.mp4 --validate-only
node scripts/render-studio-project.mjs work/本期工程.json output/本期-v1.mp4
```

导出经当前工作台的任务接口执行并留下任务/结果记录。连到其他目录会拒绝导出。命令验证成功不等于成片已审完；还要检查最终编码、声画同步、字幕、文字清晰度、配乐和素材真实性。已有输出不会覆盖，修改时使用新版本名。付费生成服务是可选能力，须自行配置账号并确认预算。

## 交给助手的指令

> 请在我提供的工作台文件夹使用 Presenter Video Studio。先读 skills/overlay-studio-editor/SKILL.md，检查已保存的个人标准，缺失时询问我。安装并后台启动工作台，读取实际连接信息；选择合适模板建立草稿，根据我的真实口播、SRT、截图和曲库制作。工程、预览和导出都通过工作台。方案需确认时先等确认，不能把模板演示当成我的成片。交付 MP4、可编辑工程和检查记录。

WorkBuddy 客户端的技能管理入口随版本而异；本次验证本地命令和工作台链路，不宣称已通过全部客户端版本实机验收或技能市场审核。
