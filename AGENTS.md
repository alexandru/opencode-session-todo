# Plugin Development Guide

This repository is the local, pinned copy of `opencode-session-todo` used by OpenCode Desktop and the terminal UI. OpenCode loads it by absolute path from the global config, not from npm.

## Local installation

The plugin is loaded from `~/.config/opencode/opencode.json`:

```json
"plugins": ["/Users/administrator/Projects/Personal/opencode-session-todo"]
```

- `opencode plugin list` should show `session-todo local /Users/administrator/Projects/Personal/opencode-session-todo`.
- `opencode plugin check` should report no package plugins.
- `opencode plugin update` only updates package plugins; it does not replace this local clone.
- OpenCode watches the local source and reloads it. Rebuild the GUI bundle after changing GUI code or any schema bundled into the GUI.

## Parts

- `index.ts` — server part: tools, context hook, and RPC registration.
- `tui.tsx` — terminal UI part; the TUI loads it from source.
- `rpc.ts` — shared RPC contract. Keep `sessionID` as `Schema.String` so the GUI bundle does not import `@opencode/schema/session`, which the GUI host does not provide.
- `gui.tsx` — Desktop GUI part.
- `gui-build/` — separate Vite build for the GUI. It uses `@opencode/plugin` 2.2.6 to match OpenCode Desktop 2.2.6.
- `src/model.ts` — todo schema, including the single-`in_progress` and numbered-parent completion rules.
- `src/instructions.ts` — injected system and tool instructions; keep the lifecycle and hierarchy rules current.
- `src/store.ts` — file storage. Keep path confinement, symlink checks, and atomic writes intact.

## Build and check

```bash
npm run check                     # server, TUI, RPC typecheck
npm --prefix gui-build run check  # GUI typecheck
npm --prefix gui-build run build  # writes gui-experimental.cjs
bun run build                     # builds dist/tui.js
```

`gui-experimental.cjs` is generated and gitignored. `package.json` exports it as `./gui-experimental` and includes it in `files`.

The GUI build is intentionally separate from the server/TUI runtime dependencies: server and TUI stay on the pinned 2.0.27 SDK, while the GUI build uses 2.2.6 to match the Desktop app. If Desktop updates, update `gui-build/package.json` to the matching `@opencode/plugin` version and rebuild.

## Todo format

- The list is a flat todo.txt file at `.agents/sessions/<session-id>/todo.txt`.
- Hierarchy is expressed with numbered prefixes: `1.`, `1.1.`, `1.2.`. The Desktop panel indents sub-items.
- A numbered parent may be `completed` only after all of its numbered sub-tasks are `completed` or `cancelled`; `src/model.ts` enforces this.
- Priorities map to todo.txt `(A)` high, `(B)` medium, `(C)` low. The Desktop panel shows the words.
- The instructions in `src/instructions.ts` must tell the agent to keep the list current, use numbered hierarchy, and respect the parent completion rule.

## Security

- Do not add network calls, command execution, `eval`, dynamic code loading, or credential/environment access.
- Keep file access confined to the session project's `.agents/sessions/<session-id>/todo.txt`.
- Keep the `todowrite` permission gate; deny, ask, and unmatched rules must not allow writes.
- Keep subagent sessions blocked from the todo tools.
- The GUI bundle may import only the modules OpenCode provides to GUI plugins. Do not import `@opencode/schema/session` there.
