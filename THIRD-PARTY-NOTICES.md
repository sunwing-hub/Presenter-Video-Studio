# 第三方组件

本安装包分发工作台源码，不捆绑 Node.js、Chromium、FFmpeg 或 Python 模型。安装时会按锁文件从各项目来源下载依赖。

主要组件包括 React（MIT）、Vite（MIT）、TypeScript（Apache-2.0）、Playwright（Apache-2.0）、pnpm（MIT）以及 ffmpeg-static（GPL-3.0-or-later；所下载 FFmpeg 二进制以对应构建的许可说明为准）。完整依赖版本见 `pnpm-lock.yaml`，安装后的许可证见对应 `node_modules` 包。

项目来源：

- https://github.com/facebook/react
- https://github.com/vitejs/vite
- https://github.com/microsoft/TypeScript
- https://github.com/microsoft/playwright
- https://github.com/pnpm/pnpm
- https://github.com/eugeneware/ffmpeg-static

如果另行制作含依赖二进制的安装器，应同时处理相关许可证及源码提供义务。本包不对原作者源码另行添加或变更许可证。
