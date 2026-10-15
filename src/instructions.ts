export const TodoWriteInstructions: string = `### \`todowrite\`

Replace this session’s TODO list.

- You MUST pass the last known saved list as \`previous\`; use \`[]\` when known empty.
- You SHOULD reuse the returned saved list for subsequent writes.
- On conflict, you MUST call \`todoread\` and retry.`

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

export const TodoInstructions: string =
  `${TodoWriteInstructions}\n\n${TodoReadInstructions}\n\n${TodoLifecycleInstructions}`
