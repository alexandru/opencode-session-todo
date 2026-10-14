import type { Todo, Todos } from "./model.ts"

export const todoSymbols: Readonly<Record<Todo["status"], string>> = {
  pending: "[ ]",
  in_progress: "[•]",
  completed: "[✓]",
  cancelled: "[–]",
}

export const formatTodo = (todo: Todo): string =>
  `${todoSymbols[todo.status]} ${todo.content} · ${todo.priority}`

const keyFor = (todo: Todo): string => `${todo.status}|${todo.priority}|${todo.content}`

export const summarizeTodos = (previous: Todos, next: Todos): string => {
  const unchanged: Map<string, number> = new Map()
  for (const todo of previous) {
    const key: string = keyFor(todo)
    unchanged.set(key, (unchanged.get(key) ?? 0) + 1)
  }
  const lines: string[] = []
  for (const todo of next) {
    const key: string = keyFor(todo)
    const remaining: number = unchanged.get(key) ?? 0
    if (remaining > 0) {
      unchanged.set(key, remaining - 1)
    } else {
      lines.push(formatTodo(todo))
    }
  }
  return lines.join("\n")
}
