# WorkBuddy 接入

## 官方依据

WorkBuddy 官方文档说明技能由 SKILL.md 与可选 scripts/references/assets 目录组成，支持技能安装；企业版文档提供本地技能包上传说明。

- https://open.workbuddy.cn/docs/skill
- https://cloud.tencent.com/document/product/1831/134432

## 安装顺序

1. 从有权限访问的 GitHub Release 下载工作台完整 ZIP，完整解压，安装并启动。
2. 下载 `overlay-studio-editor-skill-2026.11.5.zip`。它是独立技能包，不把工作台程序塞进 Skill 上下文。
3. 在 WorkBuddy 技能管理中选择本地包上传/导入；不同版本入口可能不同，以实际界面和官方说明为准。不改写客户端内部配置。
4. 将工作台文件夹加入当前助手可访问工作空间；给出安装位置与实际端口。
5. 使用“Overlay Studio 剪辑这个口播”的指令，并提供真实素材、发布规格和配乐路径。

可先让助手执行 `node scripts/studio-cli.mjs env-check` 和 `node scripts/studio-cli.mjs list-templates --json`。助手读取选定模板的规范后，再安排分镜与原生工程。

## 适用环境

需要 WorkBuddy 具备本地文件读取、运行命令与浏览器/预览访问能力，并获用户授权。仅在远程运行的会话不能凭 localhost 访问另一台电脑。本包不含远程 MCP 桥接，也不宣称已上架技能市场。本次验证技能结构与脚本入口，尚未在每个 WorkBuddy 版本实机完成全流程测试。

Codex 或其他兼容客户端可导入同一个技能文件夹，或将其放入该客户端支持的技能位置；以客户端文档为准，不强行使用 WorkBuddy 的目录。
