const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const root = join(__dirname, '..')
const cache = join(root, '.cache', 'electron-builder')
mkdirSync(cache, { recursive: true })
writeFileSync(join(cache, 'package.json'), '{"type":"commonjs"}\n', 'utf8')

const executable = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder')
const result = spawnSync(executable, ['--win', 'nsis'], {
  cwd: root,
  env: { ...process.env, ELECTRON_BUILDER_CACHE: cache },
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
