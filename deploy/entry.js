#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// LinyaShare – Init-Wrapper (PID 1)
//
// Warum: FeatherPanel/Pterodactyl-"^C"-Stopps sind historisch inkonsistent.
//   - manche Daemons senden SIGINT,
//   - andere fallen auf SIGTERM zurück (auch `docker stop`),
//   - manche schreiben den Stopp ohne Signal an stdin (^C = 0x03),
//   - und wenn die Konsole/TTY geschlossen wird, kommt zusätzlich SIGHUP.
//
// WICHTIG (PID-1-Kette): Dieser Wrapper MUSS selbst PID 1 sein. Starte ihn
// über `export ... && cd .next/standalone && exec node entry.js` – NICHT über
// `exec env X=1 node entry.js`, denn dann würde `env` PID 1 werden und diesen
// Wrapper nur als (nicht reagierendes) Kind forken. Stopps erreichen ihn dann
// nicht mehr.
//
// Bei JEDEM erkannten Stopp wird die Diagnose in eine Log-Datei geschrieben
// (und auf stderr ausgegeben) und der Server beendet – garantierter Exit 0,
// damit das Panel einen sauberen "Stop" statt eines hängenden "Stopping" sieht.
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
  `Wrapper gestartet: PID=${process.pid} PPID=${process.ppid} ` +
  `stdin=${process.stdin.isTTY ? 'tty' : 'nicht-tty'} hub=${process.stdin.isTTY && process.stdin.hasColors ? 'yes' : 'no'}`
)

let child
let initiatedShutdown = false

function shutdown(source) {
  if (initiatedShutdown) return
  initiatedShutdown = true
  log(`Stopp '${source}' erkannt – Server wird beendet`)
  try { child.kill('SIGTERM') } catch (e) { log(`SIGTERM fehlgeschlagen: ${e.message}`) }
  // Sicherheitsnetz 1: hängt der Server am SIGTERM, wird nach 4 s hart beendet.
  setTimeout(() => {
    if (!initiatedShutdown) return
    log('SIGTERM ignoriert – sende SIGKILL')
    try { child.kill('SIGKILL') } catch (e) { /* bereits beendet */ }
    // Sicherheitsnetz 2: Selbst wenn das Kind sich weigert zu sterben, den
    // Prozess endgültig beenden – der Docker/Panel-Grace-Timeout darf nie hier
    // hängen bleiben.
    setTimeout(() => { log('Notausstieg'); process.exit(0) }, 1000).unref()
  }, 4000).unref()
}

child = spawn('node', [SERVER_SCRIPT], {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: process.env,
})

child.on('error', (err) => {
  log(`Server-Start fehlgeschlagen: ${err.message}`)
  process.exit(1)
})

child.on('close', (code, signal) => {
  if (initiatedShutdown) {
    log(`Server beendet (code=${code} signal=${signal}) – sauberer Exit 0`)
    process.exit(0)
  }
  log(`Server unerwartet beendet (code=${code} signal=${signal}) – Exit wird durchgereicht`)
  process.exit(code ?? 1)
})

// ── Signale (CTRL+C am TTY, docker stop, Panel-Stop, Konsole geschlossen) ──
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGHUP', () => shutdown('SIGHUP'))

// ── Stdin-"^C": Panels, die den Stopp als Bytes an stdin schreiben ───────────
process.stdin.resume()
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  const s = String(chunk)
  if (/[\u0003]/.test(s) || s.includes('^C')) shutdown('stdin^C (data=' + JSON.stringify(s) + ')')
})
process.stdin.on('error', () => { /* stdin geschlossen – kein Grund zum Beenden */ })