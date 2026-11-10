import { Command, MenuItem, Panel, Plugin, type MountedSession, type PanelTab } from "@opencode/plugin/gui"
import { For, Show, createEffect, createSignal, onCleanup } from "solid-js"
import { TodoRpc } from "./rpc.ts"
import { type Snapshot, type Todo } from "./src/model.ts"

type View =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly snapshot: Snapshot }
  | { readonly status: "error"; readonly message: string }

const messageFor = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) return String(error.message)
  return String(error)
}

const contentColor: Readonly<Record<Todo["status"], string>> = {
  pending: "var(--text-base)",
  in_progress: "var(--text-base)",
  completed: "var(--text-weak)",
  cancelled: "var(--text-weaker)",
}

const priorityColor: Readonly<Record<Todo["priority"], string>> = {
  high: "var(--icon-critical-base)",
  medium: "var(--text-weak)",
  low: "var(--text-weaker)",
}

const indentFor = (content: string): number => {
  const match = content.match(/^(\d+(?:\.\d+)*)\.?\s+/)
  const number = match?.[1]
  if (number === undefined) return 0
  return Math.min(number.split(".").length - 1, 4) * 18
}

const checkboxStyle = (
  status: Todo["status"],
): { readonly borderColor: string; readonly color: string; readonly background: string } => {
  switch (status) {
    case "pending":
      return { borderColor: "var(--border-weak-base)", color: "var(--text-weak)", background: "transparent" }
    case "in_progress":
      return {
        borderColor: "var(--border-warning-base)",
        color: "var(--icon-warning-base)",
        background: "var(--surface-warning-weak)",
      }
    case "completed":
      return {
        borderColor: "var(--border-success-base)",
        color: "var(--icon-success-base)",
        background: "var(--surface-success-weak)",
      }
    case "cancelled":
      return {
        borderColor: "var(--border-critical-base)",
        color: "var(--icon-critical-base)",
        background: "var(--surface-critical-weak)",
      }
  }
}

const checkboxGlyph = (status: Todo["status"]): string => {
  switch (status) {
    case "pending":
      return ""
    case "in_progress":
      return "•"
    case "completed":
      return "✓"
    case "cancelled":
      return "×"
  }
}

const Checkbox = (props: { readonly status: Todo["status"] }) => {
  const style = checkboxStyle(props.status)
  return (
    <span
      style={{
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        width: "16px",
        height: "16px",
        "flex-shrink": 0,
        "border-radius": "4px",
        border: "1px solid",
        "border-color": style.borderColor,
        background: style.background,
        color: style.color,
        "font-size": "12px",
        "font-weight": 600,
        "line-height": 1,
        "margin-top": "1px",
      }}
    >
      {checkboxGlyph(props.status)}
    </span>
  )
}

export default Plugin.define({
  i18n: {
    en: {
      "panel.title": "To-Do List",
      "command.group": "Session",
      "command.toggle": "Toggle To-Do List",
      "menu.todos": "Session todos",
      "empty": "No todos for this session.",
      "loading": "Loading…",
      "error": "Cannot read todos",
      "remaining": "remaining",
    },
  },
  setup(ctx) {
    const tab: PanelTab = {
      id: "todos",
      get title() {
        return ctx.t("panel.title")
      },
      closable: "compact",
      fallback: true,
    }

    const TodoPanel = (props: { readonly session: MountedSession }) => {
      const [view, setView] = createSignal<View>({ status: "loading" })

      createEffect(() => {
        const sessionID = props.session.id
        const location = props.session.location
        if (!location) {
          setView({ status: "loading" })
          return
        }
        const controller = new AbortController()
        let running = false

        const refresh = async (): Promise<void> => {
          if (running || controller.signal.aborted) return
          running = true
          try {
            const snapshot = await ctx.client.rpc(TodoRpc).read(
              { sessionID },
              { signal: controller.signal, location },
            )
            if (!controller.signal.aborted) setView({ status: "ready", snapshot })
          } catch (error) {
            if (!controller.signal.aborted) setView({ status: "error", message: messageFor(error) })
          } finally {
            running = false
          }
        }

        setView({ status: "loading" })
        void refresh()
        const timer = setInterval(() => void refresh(), 2000)
        const unsubscribe = ctx.client.rpc(TodoRpc).events.on(
          "updated",
          (event) => {
            if (event.data.sessionID === sessionID) void refresh()
          },
          { signal: controller.signal },
        )
        onCleanup(() => {
          controller.abort()
          clearInterval(timer)
          unsubscribe()
        })
      })

      const snapshot = (): Snapshot | undefined => {
        const current = view()
        return current.status === "ready" ? current.snapshot : undefined
      }
      const todos = (): readonly Todo[] => snapshot()?.todos ?? []
      const remaining = (): number =>
        todos().reduce(
          (count, todo) => count + Number(todo.status === "pending" || todo.status === "in_progress"),
          0,
        )
      const error = (): string | undefined => {
        const current = view()
        return current.status === "error" ? current.message : undefined
      }

      return (
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "2px",
            padding: "12px",
            height: "100%",
            "box-sizing": "border-box",
            overflow: "auto",
            color: "var(--text-base)",
          }}
        >
          <div
            style={{
              display: "flex",
              "align-items": "baseline",
              "justify-content": "space-between",
              gap: "8px",
              "margin-bottom": "8px",
            }}
          >
            <strong style={{ "font-size": "13px", "letter-spacing": "0.02em" }}>{ctx.t("panel.title")}</strong>
            <span style={{ "font-size": "12px", color: "var(--text-weak)" }}>
              {remaining()} {ctx.t("remaining")}
            </span>
          </div>
          <Show when={error()}>
            <div style={{ color: "var(--text-error)", "font-size": "12px" }}>
              {ctx.t("error")}: {error()}
            </div>
          </Show>
          <Show when={view().status === "loading"}>
            <div style={{ color: "var(--text-weak)", "font-size": "12px" }}>{ctx.t("loading")}</div>
          </Show>
          <Show when={view().status === "ready" && todos().length === 0}>
            <div style={{ color: "var(--text-weak)", "font-size": "12px" }}>{ctx.t("empty")}</div>
          </Show>
          <For each={todos()}>
            {(todo) => (
              <div
                style={{
                  display: "flex",
                  "align-items": "flex-start",
                  gap: "8px",
                  padding: "5px 0",
                  "padding-left": `${indentFor(todo.content)}px`,
                  "border-bottom": "1px solid var(--border-weaker-base)",
                }}
              >
                <Checkbox status={todo.status} />
                <span
                  style={{
                    flex: 1,
                    "font-size": "13px",
                    "line-height": "1.35",
                    "white-space": "pre-wrap",
                    "word-break": "break-word",
                    color: contentColor[todo.status],
                    "text-decoration":
                      todo.status === "completed" || todo.status === "cancelled" ? "line-through" : undefined,
                  }}
                >
                  {todo.content}
                </span>
                <span
                  style={{
                    "font-size": "10px",
                    color: priorityColor[todo.priority],
                    "text-transform": "capitalize",
                    "letter-spacing": "0.03em",
                    opacity: 0.8,
                  }}
                >
                  {todo.priority}
                </span>
              </div>
            )}
          </For>
        </div>
      )
    }

    ctx.add(Panel, {
      id: "todos",
      region: "side",
      width: 320,
      mobile: {
        title: ctx.t("panel.title"),
        order: 45,
        kind: "menu",
        icon: "checklist",
      },
      list: (input) => (input.open.includes(tab.id) ? [tab] : []),
      render: (props) => <TodoPanel session={props.session} />,
    })

    ctx.add(Command, (): Command => ({
      id: "todos",
      title: ctx.t("command.toggle"),
      group: ctx.t("command.group"),
      section: "session",
      slash: { name: "todos" },
      run: () => {
        const session = ctx.sessions.current()
        if (!session) return
        const key = `${ctx.id}:${tab.id}`
        if (ctx.layout.state(key, session) === "closed") ctx.layout.open(key, session)
        else ctx.layout.close(key, session)
      },
    }))

    ctx.add(MenuItem, (): MenuItem => {
      const session = ctx.sessions.current()
      return {
        menu: "session.panel",
        id: "todos",
        title: ctx.t("menu.todos"),
        icon: "checklist",
        opened: session !== undefined && ctx.layout.state(`${ctx.id}:${tab.id}`, session) !== "closed",
        run: () => {
          const current = ctx.sessions.current()
          if (current) ctx.layout.open(`${ctx.id}:${tab.id}`, current)
        },
      }
    })
  },
})
