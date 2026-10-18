export const TodoWriteInstructions: string = `### \`todowrite\`

Replace this session’s TODO list.

- You MUST pass the last known saved list as \`previous\`; use \`[]\` when known empty.
- You SHOULD reuse the returned saved list for subsequent writes.
- On conflict, you MUST refresh the saved list and retry.`

export const TodoReadInstructions: string = `### \`todoread\`

Read this session’s saved TODO list and storage path.

- You SHOULD use \`todoread\` only when the saved list is unknown or \`todowrite\` reports a conflict.`

export const TodoLifecycleInstructions: string = `### TODO lifecycle

- You MUST create a TODO list when you have more than one work item to track.
- You MUST NOT create a TODO list for a straightforward question or a single work item.
- You MUST NOT split a single work item into artificial steps just to justify a TODO list.

The following rules apply only when a TODO list is needed or already tracks unfinished work.

- You MUST keep this session's TODO list synchronized with the requested work and its actual progress.
- You MUST preserve existing tasks, order, statuses, and priorities unless actual progress or the user's instructions require a change.
- You MUST mark a task in_progress before starting it. You MUST keep at most one task in_progress.
- You MUST mark a task completed immediately after finishing its work and required verification.
- You MUST NOT mark blocked, failed, skipped, unfinished, or unverified work completed. Unstarted or deferred work MUST remain pending; cancelled work MUST be represented as cancelled.
- You MUST update the list after each meaningful status transition. You MUST NOT batch status updates until the end of the conversation or leave finished work in_progress.
- Before your final response, you MUST reconcile the list with what was actually done and accurately retain unfinished work.
- You SHOULD keep task descriptions concise and actionable.`

export const TodoCodeModeInstructions: string = `### Code Mode

- You SHOULD prefer Code Mode for TODO updates.
- When the current list is known, call \`tools.todo.write\` directly with that \`previous\` list; do not read first.
- Read with \`tools.todo.read()\` only when the saved list is unknown or a write reports a conflict.
- When you need both, perform them sequentially in one execute call: await the read, pass the returned \`todos\` as \`previous\`, await the write, and return only the final snapshot.
- You MUST NOT use \`Promise.all\` for dependent TODO operations.
- You MUST NOT batch lifecycle transitions in one call.

\`\`\`ts
const { todos } = await tools.todo.read()
return await tools.todo.write({
  previous: todos,
  todos: [...todos, { content: "Run the tests", status: "pending", priority: "high" }],
})
\`\`\``

export const TodoWriteAliasDescription: string = "Replace this session’s TODO list."

export const TodoReadAliasDescription: string =
  "Read this session’s saved TODO list and storage path."

export const TodoNamespaceDescription: string =
  "Session TODO list tools. Prefer one execute call per update: write with the last known list; read only when the saved list is unknown or a write reports a conflict."

export const TodoInstructions: string =
  `${TodoWriteInstructions}\n\n${TodoReadInstructions}\n\n${TodoLifecycleInstructions}\n\n${TodoCodeModeInstructions}`
