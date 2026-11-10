import { Rpc } from "@opencode/schema/rpc"
import { Schema } from "effect"
import { Snapshot } from "./src/model.ts"

export const TodoRpc = Rpc.define({
  id: "session-todo",
  methods: {
    read: {
      input: Schema.toStandardSchemaV1(Schema.Struct({ sessionID: Schema.String })),
      output: Schema.toStandardSchemaV1(Snapshot),
      errors: { storage: Schema.toStandardSchemaV1(Schema.Struct({ message: Schema.String })) },
    },
  },
  events: {
    updated: {
      schema: Schema.toStandardSchemaV1(
        Schema.Struct({ sessionID: Schema.String, diff: Schema.String, summary: Schema.String }),
      ),
    },
  },
})
