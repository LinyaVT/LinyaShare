import { Readable } from "stream"

/**
 * Converts a Node.js Readable into a Web ReadableStream without the
 * `Readable.toWeb()` bug (nodejs/node#64529): "Invalid state: Controller is
 * already closed" as uncaughtException when the stream is aborted during
 * backpressure (HEAD requests, client disconnect, video seek probe, ...).
 *
 * Pull-based `for await` + guarded enqueue/close/error calls ensure
 * that an abort quietly ends the source stream instead of throwing an
 * uncaughtException.
 */
export function nodeStreamToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of nodeStream) {
          try {
            controller.enqueue(chunk)
          } catch {
            // Controller already closed/aborted → end the source cleanly
            nodeStream.destroy()
            break
          }
        }
        try { controller.close() } catch { /* already closed */ }
      } catch (err) {
        try { controller.error(err) } catch { /* already closed */ }
      }
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}
