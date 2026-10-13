# OpenCode TODO

**A task list that stays with your session.**

Session-local [todo.txt](https://github.com/todotxt/todo.txt) for OpenCode V2.
Tools for the agent. A sidebar for you. Plain text you can edit.

[npm](https://www.npmjs.com/package/opencode-session-todo)

## Get started

Add to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-session-todo",
      "options": {
        "sidebarLimit": 5,
      },
    },
  ],
}
```

Reload OpenCode and reopen the TUI.

- **Read and write** with `todoread` and `todowrite`, with conflict detection and change diffs.
- **Keep tasks in view** in the sidebar; open `/todos` for the full list.
- **Own the file** at `.agents/sessions/<session-id>/todo.txt`.

[Usage & permissions](USAGE.md) · [Development & publishing](docs/development.md) · [MIT](LICENSE)
