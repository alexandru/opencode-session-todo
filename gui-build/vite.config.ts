import { defineConfig } from "vite"
import { gui } from "@opencode/plugin/gui/vite"

export default defineConfig({
  root: "..",
  plugins: [gui({ entry: "gui.tsx", outFile: "gui-experimental.cjs" })],
})
