import { Path } from "@opencode/util/global"
import { join } from "node:path"

export const TodoHome: string = join(Path.data, "todos")
