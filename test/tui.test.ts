import {
  OpenCode,
  type OpenCodeClient,
  type RpcClient,
  type RpcEventPayload,
} from "@opencode/client"
import type {
  Context,
  KeymapLayer,
  Route,
  SlotClaim,
  SlotPath,
  ToastOptions,
} from "@opencode/plugin/tui/context"
import type { Cleanup, Definition } from "@opencode/plugin/tui/plugin"
import { Session } from "@opencode/schema/session"
import { ensureSolidTransformPlugin } from "@opentui/solid/bun-plugin"
import { afterEach, expect, spyOn, test } from "bun:test"
import { Schema } from "effect"
import type { Store } from "solid-js/store"
import { TodoRpc } from "../rpc.ts"

ensureSolidTransformPlugin()
const plugin: Definition = (await import("../tui.tsx")).default

const SESSION_ID: string = "ses_tui"
const LOCATION_DIRECTORY: string = "/tmp/opencode/tui-fixture"

const unexpected = (property: string): never => {
  throw new Error(`TUI fixture property '${property}' must not be accessed by plugin setup`)
}

type UpdatedHandler = (event: RpcEventPayload<typeof TodoRpc, "updated">) => void

interface SlotRegistration {
  readonly target: SlotPath | undefined
  cleanups: number
}

interface Fixture {
  readonly context: Context
  readonly toasts: ToastOptions[]
  readonly subscribed: string[]
  readonly unsubscribe: { calls: number }
  readonly slots: SlotRegistration[]
  readonly emitUpdated: UpdatedHandler
}

const restorers: Array<() => void> = []

afterEach((): void => {
  for (const restore of restorers) restore()
  restorers.length = 0
})

const makeFixture = (themeMode: "light" | "dark"): Fixture => {
  const client: OpenCodeClient = OpenCode.make({ baseUrl: "http://127.0.0.1:1" })
  const api: RpcClient<typeof TodoRpc> = client.rpc(TodoRpc)
  const toasts: ToastOptions[] = []
  const subscribed: string[] = []
  const unsubscribe = { calls: 0 }
  const slots: SlotRegistration[] = []
  const rpcSpy = spyOn(client, "rpc")
  rpcSpy.mockReturnValue(api)
  const onSpy = spyOn(api.events, "on")
  onSpy.mockImplementation((name): () => void => {
    subscribed.push(name)
    return (): void => {
      unsubscribe.calls += 1
    }
  })
  restorers.push(
    (): void => rpcSpy.mockRestore(),
    (): void => onSpy.mockRestore(),
  )
  const emitUpdated: UpdatedHandler = (event): void => {
    for (const [name, handler] of onSpy.mock.calls) {
      if (name === "updated") handler(event)
    }
  }
  const context: Context = {
    options: {},
    get location(): never {
      return unexpected("location")
    },
    get app(): never {
      return unexpected("app")
    },
    get renderer(): never {
      return unexpected("renderer")
    },
    client,
    get data(): never {
      return unexpected("data")
    },
    get attention(): never {
      return unexpected("attention")
    },
    get theme(): never {
      return unexpected("theme")
    },
    themeMode,
    get markdown(): never {
      return unexpected("markdown")
    },
    keymap: {
      layer: (factory: () => KeymapLayer): void => {
        void factory
      },
      get dispatch(): never {
        return unexpected("keymap.dispatch")
      },
      get shortcuts(): never {
        return unexpected("keymap.shortcuts")
      },
      get commands(): never {
        return unexpected("keymap.commands")
      },
      get pending(): never {
        return unexpected("keymap.pending")
      },
      get active(): never {
        return unexpected("keymap.active")
      },
      get mode(): never {
        return unexpected("keymap.mode")
      },
    },
    storage: {
      store: <Value extends object>(
        key: string,
        options: { readonly initial: Value },
      ): readonly [Store<Value>, (mutation: (draft: Value) => void) => Promise<void>] => {
        void key
        const value: Value = options.initial
        const update = async (mutation: (draft: Value) => void): Promise<void> => {
          mutation(value)
        }
        return [value, update]
      },
      get memory(): never {
        return unexpected("storage.memory")
      },
    },
    ui: {
      get dialog(): never {
        return unexpected("ui.dialog")
      },
      toast: {
        show: (options: ToastOptions): void => {
          toasts.push(options)
        },
      },
      get format(): never {
        return unexpected("ui.format")
      },
      router: {
        current: (): Route => ({ type: "session", sessionID: SESSION_ID }),
        get register(): never {
          return unexpected("ui.router.register")
        },
        get navigate(): never {
          return unexpected("ui.router.navigate")
        },
      },
      get panel(): never {
        return unexpected("ui.panel")
      },
      get tabs(): never {
        return unexpected("ui.tabs")
      },
      get model(): never {
        return unexpected("ui.model")
      },
      slot: (claim: SlotClaim): () => void => {
        const registration: SlotRegistration = { target: claim.append, cleanups: 0 }
        slots.push(registration)
        return (): void => {
          registration.cleanups += 1
        }
      },
    },
  }
  return { context, toasts, subscribed, unsubscribe, slots, emitUpdated }
}

const eventPayload = (
  diff: string,
  summary: string,
): RpcEventPayload<typeof TodoRpc, "updated"> => ({
  id: "evt_tui",
  created: 0,
  location: { directory: LOCATION_DIRECTORY },
  type: "rpc.session-todo.updated",
  data: { sessionID: Schema.decodeUnknownSync(Session.ID)(SESSION_ID), diff, summary },
})

const THEME_MODES: ReadonlyArray<"light" | "dark"> = ["light", "dark"]

for (const themeMode of THEME_MODES) {
  test(`TODO updates stay silent and setup cleans up (${themeMode})`, (): void => {
    const fixture: Fixture = makeFixture(themeMode)
    const setupResult: Promise<Cleanup | void> | Cleanup | void = plugin.setup(fixture.context)
    if (typeof setupResult !== "function") {
      throw new Error("Expected TUI plugin setup to return a synchronous cleanup")
    }
    const cleanup: Cleanup = setupResult
    const handler: UpdatedHandler = fixture.emitUpdated

    handler(eventPayload("- [pending|high] Alpha\n+ [completed|high] Alpha", "[✓] Alpha · high"))
    expect(fixture.toasts).toEqual([])

    handler(eventPayload("- [pending|high] Alpha\n- [pending|medium] Beta", ""))
    handler(eventPayload("- [pending|high] Alpha\n+ [pending|high] Alpha", ""))
    handler(eventPayload("", ""))
    expect(fixture.toasts).toHaveLength(0)

    cleanup()
    expect(fixture.unsubscribe.calls).toBe(fixture.subscribed.length)
    expect(fixture.slots.map((slot): SlotPath | undefined => slot.target)).toEqual([
      "sidebar.content",
      "session.panel",
    ])
    expect(fixture.slots.map((slot): number => slot.cleanups)).toEqual([1, 1])
  })
}
