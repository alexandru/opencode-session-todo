# Development

Requires Bun >= 1.4.2.

```sh
bun ci
make test
```

`make test` runs typecheck, tests, and formatting checks.
`make upgrade-dependencies` updates pinned dependencies and the lockfile.

## Package entry points

The package ships TypeScript sources for OpenCode's Bun runtime and precompiled Solid ESM for the TUI. Run `bun run build` before loading the local package; packing builds the TUI automatically.

- `opencode-session-todo`: tools and RPC handlers.
- `opencode-session-todo/tui`: sidebar and full panel.
- `opencode-session-todo/rpc`: shared RPC definitions.

## Publishing

```sh
npm login
make publish
```

`make publish` runs the checks and a package dry-run before `npm publish --access public`.
