import { Readable } from "stream"

/**
 * Konvertiert einen Node.js Readable in einen Web ReadableStream, ohne den
 * `Readable.toWeb()`-Bug (nodejs/node#64529): "Invalid state: Controller is
 * already closed" als uncaughtException, wenn der Stream während Backpressure
 * abgebrochen wird (HEAD-Anfragen, Client-Disconnect, Video-Seek-Probe, ...).
 *
 * Pull-basiertes `for await` + abgesicherte enqueue/close/error-Aufrufe sorgen
 * dafür, dass ein Abbruch den Quell-Stream leise beendet, statt eine
 * uncaughtException zu werfen.
 */
export function nodeStreamToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of nodeStream) {
          try {
            controller.enqueue(chunk)
          } catch {
            // Controller bereits geschlossen/abgebrochen → Quelle sauber beenden
            nodeStream.destroy()
            break
          }
        }
        try { controller.close() } catch { /* bereits geschlossen */ }
      } catch (err) {
        try { controller.error(err) } catch { /* bereits geschlossen */ }
      }
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}
