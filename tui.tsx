import { Plugin } from "@opencode/plugin/tui"
import type { KeymapLayer, PanelInput } from "@opencode/plugin/tui/context"
import { Session } from "@opencode/schema/session"
import type { ResolvedTheme } from "@opencode/theme/tui"
import type { MouseEvent } from "@opentui/core"
import type { JSX } from "@opentui/solid"
import { Effect, Result, Schema } from "effect"
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js"
import { TodoRpc } from "./rpc.ts"
import { type Snapshot, type Todo } from "./src/model.ts"
import { projectTodos, SidebarOptions, type TodoProjection } from "./src/sidebar.ts"
import { formatTodo, todoSymbols } from "./src/summary.ts"

type View =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly snapshot: Snapshot }
  | { readonly status: "error"; readonly message: string }

type Props =
  | { readonly sessionID: string; readonly full: true; readonly onClose: () => void }
  | { readonly sessionID: string; readonly full?: false; readonly onClose?: never }

const colorFor = (
  status: Todo["status"],
  theme: ResolvedTheme,
): ResolvedTheme["text"]["base"] => {
  switch (status) {
    case "pending":
      return theme.text.base
    case "in_progress":
      return theme.text.feedback.warning.base
    case "completed":
      return theme.text.muted
    case "cancelled":
      return theme.text.feedback.error.base
  }
}

const priorityBadge: Readonly<Record<Todo["priority"], string>> = {
  high: "(A)",
  medium: "(B)",
  low: "(C)",
}

const Message = Schema.Struct({ message: Schema.String })
const messageFor = (error: unknown): string =>
  Schema.is(Message)(error) ? error.message : String(error)

export default Plugin.define({
  id: "session-todo",
  setup(ctx): () => void {
    const options = Schema.decodeUnknownResult(SidebarOptions)(ctx.options)
    if (Result.isFailure(options)) {
      ctx.ui.toast.show({
        title: "Invalid TODO sidebar options",
        message: options.failure.message,
        variant: "error",
      })
      return (): void => {}
    }
    const api = ctx.client.rpc(TodoRpc)
    const [sidebarView, updateSidebarView] = ctx.storage.store("sidebar", {
      initial: { open: true },
    })
    const List = (props: Props): JSX.Element => {
      const [view, setView] = createSignal<View>({ status: "loading" })
      createEffect((): void => {
        const sessionID: string = props.sessionID
        setView({ status: "loading" })
        const controller: AbortController = new AbortController()
        let running: boolean = false
        const refresh = (): void => {
          if (running || controller.signal.aborted) return
          running = true
          const request: Effect.Effect<Snapshot, unknown> = Schema.decodeUnknownEffect(Session.ID)(
            sessionID,
          ).pipe(
            Effect.flatMap(
              (id): Effect.Effect<Snapshot, unknown> =>
                Effect.tryPromise({
                  try: (): Promise<Snapshot> =>
                    api.read(
                      { sessionID: id },
                      {
                        signal: controller.signal,
                        location: ctx.data.session.get(sessionID)?.location
                          ?? ctx.location
                          ?? ctx.data.location.default(),
                      },
                    ),
                  catch: (error): unknown => error,
                }),
            ),
          )
          void Effect.runPromise(
            request.pipe(
              Effect.match({
                onSuccess: (snapshot): View => ({ status: "ready", snapshot }),
                onFailure: (error): View => ({ status: "error", message: messageFor(error) }),
              }),
            ),
          )
            .then((next): void => {
              if (!controller.signal.aborted) setView(next)
            })
            .catch((error: unknown): void => {
              if (!controller.signal.aborted) {
                setView({ status: "error", message: messageFor(error) })
              }
            })
            .finally((): void => {
              running = false
            })
        }
        refresh()
        const timer: ReturnType<typeof setInterval> = setInterval(refresh, 2000)
        const unsubscribe: () => void = api.events.on("updated", (event): void => {
          if (event.data.sessionID === sessionID) refresh()
        })
        onCleanup((): void => {
          controller.abort()
          clearInterval(timer)
          unsubscribe()
        })
      })

      const snapshot: Accessor<Snapshot | undefined> = (): Snapshot | undefined => {
        const current: View = view()
        return current.status === "ready" ? current.snapshot : undefined
      }
      const projection: Accessor<TodoProjection | undefined> = createMemo(
        (): TodoProjection | undefined => {
          const current: Snapshot | undefined = snapshot()
          return current === undefined
            ? undefined
            : projectTodos(current.todos, props.full ? "full" : options.success.sidebarLimit)
        },
      )
      const todos: Accessor<readonly Todo[]> = (): readonly Todo[] => projection()?.items ?? []
      const active: Accessor<number> = (): number => projection()?.remaining ?? 0
      const more: Accessor<number | undefined> = (): number | undefined => {
        const current: TodoProjection | undefined = projection()
        return current?.kind === "limited" ? current.total : undefined
      }
      const error: Accessor<string | undefined> = (): string | undefined => {
        const current: View = view()
        return current.status === "error" ? current.message : undefined
      }
      const visible: Accessor<boolean> = (): boolean =>
        Boolean(props.full || snapshot()?.todos.length || error())
      const Header = (): JSX.Element => (
        <box
          flexDirection="row"
          gap={1}
          flexShrink={0}
          paddingBottom={props.full ? 1 : 0}
          onMouseDown={(event: MouseEvent): void => {
            if (props.full) return
            event.stopPropagation()
            void updateSidebarView((draft): void => {
              draft.open = !draft.open
            }).catch((error: unknown): void => {
              ctx.ui.toast.show({
                title: "Todo sidebar",
                message: `Cannot save expanded state: ${messageFor(error)}`,
                variant: "error",
              })
            })
          }}
        >
          <Show when={!props.full}>
            <text fg={ctx.theme.text.base}>{sidebarView.open ? "▼" : "▶"}</text>
          </Show>
          <box flexGrow={1} flexShrink={1} minWidth={0}>
            <text fg={ctx.theme.text.base}>
              <b>TODO</b>
              <span style={{ fg: ctx.theme.text.muted }}>{" "}({active()} remaining)</span>
            </text>
          </box>
          <Show when={props.full ? props.onClose : undefined}>
            {(onClose: Accessor<() => void>): JSX.Element => (
              <text
                fg={ctx.theme.text.muted}
                flexShrink={0}
                selectable={false}
                onMouseDown={(event: MouseEvent): void => {
                  event.stopPropagation()
                  onClose()()
                }}
              >
                ×
              </text>
            )}
          </Show>
        </box>
      )
      const Body = (): JSX.Element => (
        <>
          <Show when={error()}>
            <text fg={ctx.theme.text.feedback.error.base}>Cannot read todos: {error()}</text>
          </Show>
          <Show when={props.full && view().status === "ready" && todos().length === 0}>
            <text fg={ctx.theme.text.muted}>No todos for this session.</text>
          </Show>
          <Show
            when={props.full}
            fallback={
              <For each={todos()}>
                {(todo): JSX.Element => (
                  <text fg={colorFor(todo.status, ctx.theme)}>{formatTodo(todo)}</text>
                )}
              </For>
            }
          >
            <For each={todos()}>
              {(todo): JSX.Element => (
                <box flexDirection="row" gap={1}>
                  <text
                    fg={colorFor(todo.status, ctx.theme)}
                    width={3}
                    flexShrink={0}
                  >
                    {todoSymbols[todo.status]}
                  </text>
                  <box flexGrow={1} flexShrink={1} minWidth={0}>
                    <text fg={colorFor(todo.status, ctx.theme)} wrapMode="word">
                      {todo.content}
                    </text>
                  </box>
                  <text fg={ctx.theme.text.muted} width={3} flexShrink={0}>
                    {priorityBadge[todo.priority]}
                  </text>
                </box>
              )}
            </For>
          </Show>
          <Show when={more()}>
            <text
              fg={ctx.theme.text.feedback.info.base}
              onMouseDown={(event: MouseEvent): void => {
                event.stopPropagation()
                ctx.ui.panel.open("session-todo.list")
              }}
            >
              Show all {more()} todos →
            </text>
          </Show>
        </>
      )
      return (
        <Show when={visible()}>
          <Show
            when={props.full}
            fallback={
              <box flexDirection="column" gap={0} paddingTop={1}>
                <Header />
                <Show when={sidebarView.open}>
                  <Body />
                </Show>
              </box>
            }
          >
            <box flexDirection="column" flexGrow={1} minHeight={0} padding={1}>
              <Header />
              <scrollbox flexGrow={1} flexBasis={0} minHeight={0}>
                <Body />
              </scrollbox>
            </box>
          </Show>
        </Show>
      )
    }

    const sidebar: () => void = ctx.ui.slot({
      append: "sidebar.content",
      render: (props): JSX.Element => <List sessionID={props.sessionID} />,
    })
    const Panel = (props: PanelInput): JSX.Element => {
      ctx.keymap.layer(
        (): KeymapLayer => ({
          mode: "global",
          enabled: props.focused,
          commands: [
            {
              bind: "escape",
              title: "Close session todos",
              run: props.close,
            },
          ],
        }),
      )
      return <List sessionID={props.sessionID} full onClose={props.close} />
    }
    const panel: () => void = ctx.ui.slot({
      append: "session.panel",
      render: (props): JSX.Element => (
        <Show when={props.name === "session-todo.list"}>
          <Panel {...props} />
        </Show>
      ),
    })
    ctx.keymap.layer(
      (): KeymapLayer => ({
        mode: "global",
        commands: [
          {
            id: "session-todo.list",
            title: "Toggle session todos",
            group: "Session",
            palette: true,
            slash: { name: "todos" },
            enabled: ctx.ui.router.current().type === "session",
            run: (): void => {
              if (ctx.ui.panel.current()?.name === "session-todo.list") ctx.ui.panel.close()
              else ctx.ui.panel.open("session-todo.list")
            },
          },
        ],
      }),
    )
    return (): void => {
      sidebar()
      panel()
    }
  },
})
