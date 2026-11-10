# OpenCode TODO

**A task list that stays with your session.**

Session-local [todo.txt](https://github.com/todotxt/todo.txt) for OpenCode V2.
Tools for the agent. A sidebar for you. Plain text you can edit.

[![npm version](https://img.shields.io/npm/v/opencode-session-todo)](https://www.npmjs.com/package/opencode-session-todo)

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
- **Keep tasks in view** in the terminal sidebar or the Desktop side panel; open `/todos` for the full list.
- **Own the file** in OpenCode's data directory at `todos/<session-id>/todo.txt` — no `.agents` folder in your projects.

## Desktop

The plugin also ships a GUI part for OpenCode Desktop. The **To-Do List** tab is available in the session side panel; open it from **Session todos** in the **+** menu, the `/todos` slash command, or the New tab launcher. It closes like any other tab and reads the same `todos/<session-id>/todo.txt` under OpenCode's data directory as the TUI.

## Format

The list is a flat todo.txt file. Hierarchy is expressed with numbered prefixes such as `1.` and `1.1.`; the Desktop panel indents sub-items. A numbered parent can be completed only after its numbered sub-tasks are completed or cancelled. Priorities map to todo.txt `(A)` high, `(B)` medium, `(C)` low; the Desktop panel shows the words.

[MIT](LICENSE)
