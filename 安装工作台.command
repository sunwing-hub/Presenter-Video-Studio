#!/bin/zsh
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '请先从 https://nodejs.org/ 安装 Node.js 24 LTS，再双击本文件。'
else
  node scripts/studio-launcher.mjs --install
fi
echo '\n按回车关闭窗口。'
read -r
