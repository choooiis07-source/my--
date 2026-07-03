const { existsSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const electronRoot = join(__dirname, '..', 'node_modules', 'electron')
const executable = join(electronRoot, 'dist', 'electron.exe')

// Electron expects this file to contain the executable name without a newline.
// Rewriting it also repairs an interrupted Windows extraction once dist is valid.
if (existsSync(executable)) {
  writeFileSync(join(electronRoot, 'path.txt'), 'electron.exe', 'utf8')
}
