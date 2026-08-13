#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// LinyaShare – Init-Wrapper (PID 1)
//
// Warum: FeatherPanel/Pterodactyl-"^C"-Stopps sind historisch inkonsistent.
//   - manche Daemons senden SIGINT,
//   - andere fallen auf SIGTERM zurück,
//   - manche schreiben den Stopp ohne Signal einfach als Bytes an stdin
//     (^C = 0x03) – dagegen ist selbst Next.js' eigener Server nicht gefeit,
//     und die (ohnehin unzuverlässige) Instrumentation-Hook läuft im
//     standalone-Output gar nicht.
//
// Deshalb sitzt dieser Wrapper als PID 1 vor dem Next-Server (server.js),
// fängt ALLE drei Varianten ab und beendet den Prozess deterministisch UND
// sauber (Exit-Code 0 → Panel wertet den Stopp als "Stop", nicht als Crash).
//
// Aufruf:  cd .next/standalone && exec node entry.js
// Der Wrapper reicht stdout/stderr unverändert an das Panel durch.
// ─────────────────────────────────────────────────────────────────────────────

const { spawn } = require('node:child_process')
const path = require('node:path')

const SERVER_SCRIPT = path.join(__dirname, 'server.js')

let initiatedShutdown = false

function shutdown(source) {
  if (initiatedShutdown) return
  initiatedShutdown = true
  process.stderr.write(`[init] Stop erkannt (${source}) – Server wird beendet\n`)
  child.kill('SIGTERM')
  // Sicherheitsnetz: Falls der Server SIGTERM ignoriert/zu lange braucht,
  // nach 15 s hart beenden (der normale Graceful-Shutdown dauert einige s).
  const forceKill = setTimeout(() => child.kill('SIGKILL'), 15000)
  forceKill.unref()
}

const child = spawn('node', [SERVER_SCRIPT], {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: process.env,
})

child.on('error', (err) => {
  process.stderr.write(`[init] Server konnte nicht gestartet werden: ${err.message}\n`)
  process.exit(1)
})

child.on('close', (code, signal) => {
  // Bei eigeninitiiertem Stopp immer sauber (0) beenden, damit das Panel einen
  // "Stop" statt eines "Crashs" sieht. Ansonsten den echten Exit weitergeben.
  process.exit(initiatedShutdown ? 0 : (code ?? (signal ? 1 : 0)))
})

// ── Signale (klassischer CTRL+C am TTY / docker stop / Panel-Stop) ───────────
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// ── Stdin-"^C": Panels, die den Stopp als Bytes an stdin schreiben ───────────
// Nur auf echte 0x03/"^C"-Eingabe reagieren – ein geschlossenes stdin
// (End/Close) darf den Server nicht beenden, sonst stirbt er beim Start.
const stopPattern = /[\u0003]/
process.stdin.on('data', (chunk) => {
  const data = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
  if (stopPattern.test(data) || data.includes('^C')) shutdown('stdin ^C/0x03')
})