# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

opencode-bell 是 OpenCode CLI 的终端铃声通知插件。监听 4 种事件（`permission.asked`、`question.asked`、`session.idle`、`session.error`），通过输出 BEL 字符（`\x07`）实现通知。零依赖、单文件实现。

隐私设计：不读取消息内容、不执行外部命令、无网络调用，仅在 TTY 终端输出铃声。

## Commands

```bash
npm test                        # 运行测试（node:test 原生框架）
node -e "import('./index.js')"  # 烟雾测试：验证模块可导入
```

无构建步骤，纯 JS ES Module 直接发布。

## Architecture

`index.js` 导出 `OpencodeBellPlugin` 异步工厂函数，返回 `{ event(e) }` 插件对象。核心机制：

- **会话级防抖**：以 `eventType:sessionId` 为 key，默认 1200ms 内同 key 最多响铃一次
- **TTY 守卫**：`process.stdout.isTTY` 为 false 时静默跳过

### 环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENCODE_BELL_EVENTS` | 逗号分隔的监听事件列表 | `permission.asked,question.asked,session.idle,session.error` |
| `OPENCODE_BELL_DEBOUNCE` | 防抖窗口，单位毫秒 | `1200` |

### 测试辅助

插件对象同时暴露 `_ring(key, now)` 方法，供测试直接注入时间戳验证防抖逻辑，生产使用中忽略即可。

## Publishing

`package.json` 的 `files` 字段限制发布为 3 个文件：`index.js`、`README.md`、`LICENSE`。用户通过在 `~/.config/opencode/opencode.json` 添加 `"plugin": ["opencode-bell@版本"]` 安装。
