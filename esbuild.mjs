import { build, context } from "esbuild"

const watch = process.argv.includes("--watch")

const options = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  outfile: "dist/extension.js",
  external: ["vscode"],
  sourcemap: true,
  logLevel: "info",
  define: { "import.meta.url": "importMetaUrl" },
  banner: { js: 'const importMetaUrl = require("node:url").pathToFileURL(__filename).href;' },
}

if (watch) {
  const watcher = await context(options)
  await watcher.watch()
} else {
  await build(options)
}
