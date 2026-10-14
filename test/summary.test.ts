import { expect, test } from "bun:test"
import { Schema } from "effect"
import { type Todo, Todos } from "../src/model.ts"
import { summarizeTodos } from "../src/summary.ts"

type Entry = readonly [content: string, status: Todo["status"], priority: Todo["priority"]]

const list = (entries: ReadonlyArray<Entry>): Todos =>
  Schema.decodeUnknownSync(Todos)(
    entries.map(
      ([content, status, priority]: Entry): {
        content: string
        status: Todo["status"]
        priority: Todo["priority"]
      } => ({ content, status, priority }),
    ),
  )

const empty: Todos = Schema.decodeUnknownSync(Todos)([])

test("identical lists produce an empty summary", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"], ["Beta", "completed", "low"]])
  const next: Todos = list([["Alpha", "pending", "high"], ["Beta", "completed", "low"]])
  expect(summarizeTodos(previous, next)).toBe("")
})

test("two empty lists produce an empty summary", (): void => {
  expect(summarizeTodos(empty, empty)).toBe("")
})

test("a removal-only change produces an empty summary", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"], ["Beta", "pending", "medium"]])
  const next: Todos = list([["Alpha", "pending", "high"]])
  expect(summarizeTodos(previous, next)).toBe("")
})

test("clearing the list produces an empty summary", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"], ["Beta", "completed", "low"]])
  expect(summarizeTodos(previous, empty)).toBe("")
})

test("reordering unchanged tasks produces an empty summary", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"], ["Beta", "pending", "medium"]])
  const next: Todos = list([["Beta", "pending", "medium"], ["Alpha", "pending", "high"]])
  expect(summarizeTodos(previous, next)).toBe("")
})

test("each status renders with its own symbol", (): void => {
  const next: Todos = list([
    ["Pending task", "pending", "high"],
    ["Active task", "in_progress", "medium"],
    ["Finished task", "completed", "low"],
    ["Dropped task", "cancelled", "high"],
  ])
  expect(summarizeTodos(empty, next)).toBe(
    "[ ] Pending task · high\n"
      + "[•] Active task · medium\n"
      + "[✓] Finished task · low\n"
      + "[–] Dropped task · high",
  )
})

test("each priority renders in its own row", (): void => {
  const next: Todos = list([
    ["High priority", "pending", "high"],
    ["Medium priority", "pending", "medium"],
    ["Low priority", "pending", "low"],
  ])
  expect(summarizeTodos(empty, next)).toBe(
    "[ ] High priority · high\n"
      + "[ ] Medium priority · medium\n"
      + "[ ] Low priority · low",
  )
})

test("a content-only change emits only the new row", (): void => {
  const previous: Todos = list([["Old text", "pending", "high"]])
  const next: Todos = list([["New text", "pending", "high"]])
  expect(summarizeTodos(previous, next)).toBe("[ ] New text · high")
})

test("a priority-only change emits only the new row", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"]])
  const next: Todos = list([["Alpha", "pending", "medium"]])
  expect(summarizeTodos(previous, next)).toBe("[ ] Alpha · medium")
})

test("a status-only change emits only the new row", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"]])
  const next: Todos = list([["Alpha", "completed", "high"]])
  expect(summarizeTodos(previous, next)).toBe("[✓] Alpha · high")
})

test("adding a duplicate of an existing task emits one new row", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"]])
  const next: Todos = list([["Alpha", "pending", "high"], ["Alpha", "pending", "high"]])
  expect(summarizeTodos(previous, next)).toBe("[ ] Alpha · high")
})

test("two duplicates added to an empty list emit two identical rows", (): void => {
  const next: Todos = list([["Alpha", "pending", "high"], ["Alpha", "pending", "high"]])
  expect(summarizeTodos(empty, next)).toBe("[ ] Alpha · high\n[ ] Alpha · high")
})

test("removing a duplicate emits no rows", (): void => {
  const previous: Todos = list([["Alpha", "pending", "high"], ["Alpha", "pending", "high"]])
  const next: Todos = list([["Alpha", "pending", "high"]])
  expect(summarizeTodos(previous, next)).toBe("")
})

test("one changed duplicate among unchanged tasks emits only the changed row", (): void => {
  const previous: Todos = list([
    ["Same", "pending", "high"],
    ["Same", "pending", "high"],
    ["Other", "pending", "medium"],
  ])
  const next: Todos = list([
    ["Same", "pending", "high"],
    ["Same", "pending", "medium"],
    ["Other", "pending", "medium"],
  ])
  expect(summarizeTodos(previous, next)).toBe("[ ] Same · medium")
})

test("a priority change among same-content tasks omits the unchanged copy", (): void => {
  const previous: Todos = list([
    ["Same text", "pending", "high"],
    ["Same text", "pending", "medium"],
  ])
  const next: Todos = list([
    ["Same text", "pending", "high"],
    ["Same text", "pending", "low"],
  ])
  expect(summarizeTodos(previous, next)).toBe("[ ] Same text · low")
})

test("multiple changed rows appear in next order", (): void => {
  const previous: Todos = list([
    ["Alpha", "pending", "high"],
    ["Beta", "pending", "medium"],
    ["Gamma", "completed", "low"],
  ])
  const next: Todos = list([
    ["Gamma", "completed", "medium"],
    ["Beta", "in_progress", "medium"],
    ["Alpha", "pending", "high"],
  ])
  expect(summarizeTodos(previous, next)).toBe("[✓] Gamma · medium\n[•] Beta · medium")
})

test("a single status change in 1025 tasks omits the 1024 unchanged tasks", (): void => {
  const count: number = 1025
  const previousEntries: Entry[] = []
  const nextEntries: Entry[] = []
  for (let index: number = 0; index < count; index += 1) {
    previousEntries.push([`Task ${index}`, "pending", "medium"])
  }
  for (let index: number = 0; index < count; index += 1) {
    const status: Todo["status"] = index === 512 ? "completed" : "pending"
    nextEntries.push([`Task ${index}`, status, "medium"])
  }
  expect(summarizeTodos(list(previousEntries), list(nextEntries))).toBe("[✓] Task 512 · medium")
})

test("special characters in content render verbatim and match by identity", (): void => {
  const previousEntries: Entry[] = [
    ["Pipes | and || survive", "pending", "high"],
    [`Quotes "double" and 'single'`, "in_progress", "medium"],
    ["Backslashes \\ and \\\\ survive", "completed", "low"],
    ["Unicode ✓ • – café 日本語 ☕", "cancelled", "medium"],
    ["Mid dot · inside", "pending", "medium"],
    ["Resembles status : and pri : separators", "pending", "low"],
    ["priority: high with Status: capital and substatus: open", "completed", "high"],
  ]
  expect(summarizeTodos(empty, list(previousEntries))).toBe(
    "[ ] Pipes | and || survive · high\n"
      + "[•] Quotes \"double\" and 'single' · medium\n"
      + "[✓] Backslashes \\ and \\\\ survive · low\n"
      + "[–] Unicode ✓ • – café 日本語 ☕ · medium\n"
      + "[ ] Mid dot · inside · medium\n"
      + "[ ] Resembles status : and pri : separators · low\n"
      + "[✓] priority: high with Status: capital and substatus: open · high",
  )
  const nextEntries: Entry[] = previousEntries.map(
    ([content, status, priority]: Entry): Entry => [
      content,
      status,
      content === "priority: high with Status: capital and substatus: open" ? "low" : priority,
    ],
  )
  expect(summarizeTodos(list(previousEntries), list(nextEntries))).toBe(
    "[✓] priority: high with Status: capital and substatus: open · low",
  )
})

test("content resembling another row's identity key stays a distinct row", (): void => {
  const previous: Todos = list([["X", "pending", "high"]])
  const next: Todos = list([
    ["X\",\"pending\",\"high", "pending", "high"],
    ["X\\\",\"pending\",\"high", "pending", "high"],
    ["X", "pending", "high"],
  ])
  expect(summarizeTodos(previous, next)).toBe(
    "[ ] X\",\"pending\",\"high · high\n[ ] X\\\",\"pending\",\"high · high",
  )
})

test("content equal to status and priority words keeps rows distinct", (): void => {
  const previous: Todos = list([
    ["pending", "cancelled", "low"],
    ["high", "pending", "medium"],
  ])
  const next: Todos = list([
    ["pending", "cancelled", "low"],
    ["high", "pending", "high"],
  ])
  expect(summarizeTodos(previous, next)).toBe("[ ] high · high")
})
