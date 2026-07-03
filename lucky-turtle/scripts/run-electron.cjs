const { spawn } = require('node:child_process')
const { join } = require('node:path')

const executable = join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
const env = { ...process.env }

// Some IDE agent terminals set this variable for their own Electron host.
// The companion must run as Electron, not as its embedded Node.js runtime.
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(executable, ['.', ...process.argv.slice(2)], {
  cwd: join(__dirname, '..'),
  env,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
