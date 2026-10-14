import type { Todo, Todos } from "./model.ts"

export const todoSymbols: Readonly<Record<Todo["status"], string>> = {
  pending: "[ ]",
  in_progress: "[•]",
  completed: "[✓]",
  cancelled: "[–]",
}

const keyFor = (todo: Todo): string => JSON.stringify([todo.content, todo.status, todo.priority])

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
      lines.push(`${todoSymbols[todo.status]} ${todo.content} · ${todo.priority}`)
    }
  }
  return lines.join("\n")
}
