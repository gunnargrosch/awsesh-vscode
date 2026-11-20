import * as fs from "node:fs"
import * as path from "node:path"
import Mocha from "mocha"

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", color: true, timeout: 60_000 })
  const testsRoot = __dirname
  for (const file of fs.readdirSync(testsRoot)) {
    if (file.endsWith(".suite.js")) mocha.addFile(path.join(testsRoot, file))
  }
  await new Promise<void>((resolve, reject) => {
    mocha.run((failures) => (failures > 0 ? reject(new Error(`${failures} test(s) failed`)) : resolve()))
  })
}
