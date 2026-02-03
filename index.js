export const OpencodeBellPlugin = async () => {
  const bell = "\x07"
  const debounceMs = 1200
  const last = new Map()

  const ring = (key) => {
    const now = Date.now()
    const prev = last.get(key) || 0
    if (now - prev < debounceMs) return
    last.set(key, now)
    if (process.stdout && process.stdout.isTTY) {
      process.stdout.write(bell)
    }
  }

  return {
    event: async ({ event }) => {
      if (event?.type === "permission.asked") {
        const sessionId = event?.properties?.sessionID
        ring(sessionId ? `permission:${sessionId}` : "permission")
      }
      if (event?.type === "question.asked") {
        const sessionId = event?.properties?.sessionID
        ring(sessionId ? `question:${sessionId}` : "question")
      }
      if (event?.type === "session.idle") {
        const sessionId = event?.properties?.sessionID
        ring(sessionId ? `idle:${sessionId}` : "idle")
      }
      if (event?.type === "session.error") {
        const sessionId = event?.properties?.sessionID
        ring(sessionId ? `error:${sessionId}` : "error")
      }
    }
  }
}
