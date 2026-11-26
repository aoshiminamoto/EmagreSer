// Arranca API e web em paralelo, sem dependência extra, em Windows e Linux.
import { spawn } from 'node:child_process'

const children = [
  ['npm', ['run', 'dev', '--workspace', '@emagreser/api']],
  ['npm', ['run', 'dev', '--workspace', '@emagreser/web']],
].map(([command, args]) =>
  spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' }),
)

for (const child of children) {
  child.on('exit', (code) => {
    if (code) process.exitCode = code
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill()
  })
}
