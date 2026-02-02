# opencode-bell

OpenCode plugin that triggers a terminal bell on key events.

Privacy-friendly by design: no system notifications, no message content, no external commands, no network calls. It only writes the BEL control character (`\x07`) to stdout.

## Install (recommended: npm)

1. Add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-bell@0.1.0"]
}
```

2. Restart OpenCode CLI.

OpenCode will auto-install the package and cache it under `~/.cache/opencode/node_modules/`.

## Install (local file)

Copy `index.js` into `~/.config/opencode/plugins/` and restart OpenCode.

## What it does

The plugin triggers a terminal bell for these events:

- `permission.asked`
- `question.asked`
- `session.idle`
- `session.error`

## Verify

- Trigger a permission request (e.g., any tool that requires approval).
- Or wait for a session to complete (`session.idle`).

If you do not hear/see anything, check Terminal.app settings:

- Terminal.app -> Settings -> Profiles -> Bell

## Uninstall

- Remove `opencode-bell` from `opencode.json` and restart OpenCode.
- If you used the local-file method, delete `~/.config/opencode/plugins/index.js` (or whichever filename you used).

## License

MIT
