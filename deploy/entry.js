#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// LinyaShare – Init wrapper (PID 1)
//
// Why: FeatherPanel/Pterodactyl "^C" stops are historically inconsistent.
//   - some daemons send SIGINT,
//   - others fall back to SIGTERM (also `docker stop`),
//   - some write the stop to stdin without a signal (^C = 0x03),
//   - and when the console/TTY is closed, an additional SIGHUP arrives.
//
// IMPORTANT (PID-1 chain): This wrapper MUST be PID 1 itself. Start it via
// `export ... && cd .next/standalone && exec node entry.js` – NOT via
// `exec env X=1 node entry.js`, because then `env` would become PID 1 and only
// fork this wrapper as a (non-reacting) child. Stops would then never reach it.
//
// On EVERY detected stop the diagnosis is written to a log file (and printed to
// stderr) and the server exits – guaranteed exit 0, so the panel sees a clean
// "Stop" instead of a hanging "Stopping".
// ─────────────────────────────────────────────────────────────────────────────

const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const SERVER_SCRIPT = path.join(__dirname, 'server.js')
const LOG_FILE = path.join(os.homedir(), 'linyashare-init.log')

function log(msg) {
  const line = new Date().toISOString() + ' [init] ' + msg
  try { fs.appendFileSync(LOG_FILE, line + '\n') } catch {}
  try { process.stderr.write(line + '\n') } catch {}
}

log(
  `Wrapper started: PID=${process.pid} PPID=${process.ppid} ` +
  `stdin=${process.stdin.isTTY ? 'tty' : 'non-tty'} hub=${process.stdin.isTTY && process.stdin.hasColors ? 'yes' : 'no'}`
)

let child
let initiatedShutdown = false

function shutdown(source) {
  if (initiatedShutdown) return
  initiatedShutdown = true
  log(`Stop '${source}' detected – terminating the server`)
  try { child.kill('SIGTERM') } catch (e) { log(`SIGTERM failed: ${e.message}`) }
  // Safety net 1: if the server hangs on SIGTERM, force-kill after 4 s.
  setTimeout(() => {
    if (!initiatedShutdown) return
    log('SIGTERM ignored – sending SIGKILL')
    try { child.kill('SIGKILL') } catch (e) { /* already terminated */ }
    // Safety net 2: even if the child refuses to die, terminate the process
    // for good – the Docker/panel grace timeout must never hang here.
    setTimeout(() => { log('Emergency exit'); process.exit(0) }, 1000).unref()
  }, 4000).unref()
}

child = spawn('node', [SERVER_SCRIPT], {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: process.env,
})

child.on('error', (err) => {
  log(`Server start failed: ${err.message}`)
  process.exit(1)
})

child.on('close', (code, signal) => {
  if (initiatedShutdown) {
    log(`Server exited (code=${code} signal=${signal}) – clean exit 0`)
    process.exit(0)
  }
  log(`Server exited unexpectedly (code=${code} signal=${signal}) – passing through exit code`)
  process.exit(code ?? 1)
})

// ── Signals (CTRL+C on TTY, docker stop, panel stop, console closed) ──
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGHUP', () => shutdown('SIGHUP'))

// ── stdin "^C": panels that write the stop as bytes to stdin ────────────────
process.stdin.resume()
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  const s = String(chunk)
  if (/[\u0003]/.test(s) || s.includes('^C')) shutdown('stdin^C (data=' + JSON.stringify(s) + ')')
})
process.stdin.on('error', () => { /* stdin closed – no reason to exit */ })
