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
      if (event.type === "permission.asked") {
        ring(`permission:${event.properties.sessionID}`)
      }
      if (event.type === "question.asked") {
        ring(`question:${event.properties.sessionID}`)
      }
      if (event.type === "session.idle") {
        ring(`idle:${event.properties.sessionID}`)
      }
      if (event.type === "session.error") {
        ring(`error:${event.properties.sessionID}`)
      }
    }
  }
}
