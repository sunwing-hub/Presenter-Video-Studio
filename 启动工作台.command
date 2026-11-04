#!/bin/zsh
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '请先从 https://nodejs.org/ 安装 Node.js 24 LTS，再运行“安装工作台.command”。'
else
  OVERLAY_STUDIO_PORT=5180 node scripts/studio-launcher.mjs
fi
echo '\n工作台服务已停止。按回车关闭窗口。'
read -r
