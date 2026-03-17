# opencode-bell

<!-- TODO: replace with actual recording -->
<p align="center"><img src="./docs/demo.gif" alt="opencode-bell demo" width="600"></p>

Never miss an OpenCode prompt again.

- Zero dependencies — single-file plugin
- Privacy-friendly — no message content, no external commands, no network calls
- Configurable — choose which events trigger the bell
- Smart debounce — avoids bell spam for the same event type per session

## Install

### npm (recommended)

Add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-bell@0.2.0"]
}
```

Restart OpenCode. It will auto-install the package and cache it under `~/.cache/opencode/node_modules/`.

### Local file

Copy `index.js` into `~/.config/opencode/plugins/` and restart OpenCode.

## Configuration

Two environment variables control behavior:

| Variable | Default | Description |
|---|---|---|
| `OPENCODE_BELL_EVENTS` | `permission.asked,question.asked,session.idle,session.error` | Comma-separated list of events that trigger the bell |
| `OPENCODE_BELL_DEBOUNCE` | `1200` | Minimum ms between repeated bells for the same event type and session. Must be >= 1; 0 or negative falls back to default |

Example — bell only on permission requests, with a 5-second debounce:

```sh
export OPENCODE_BELL_EVENTS="permission.asked"
export OPENCODE_BELL_DEBOUNCE="5000"
```

## Supported Events

| Event | Fires when |
|---|---|
| `permission.asked` | OpenCode needs approval to run a tool |
| `question.asked` | OpenCode asks the user a question |
| `session.idle` | A session completes and is waiting for input |
| `session.error` | A session encounters an error |

## How it works

The plugin writes the BEL character (`\x07`) to stdout. Your terminal emulator interprets it — typically as an audio beep, a visual flash, or a dock badge, depending on your terminal settings.

## Troubleshooting

No sound or flash? Check your terminal bell settings:

- **Terminal.app**: Settings -> Profiles -> Bell

## Uninstall

- Remove `opencode-bell` from `opencode.json` and restart OpenCode.
- If you used the local-file method, delete `~/.config/opencode/plugins/index.js` (or whichever filename you used).

## License

MIT
