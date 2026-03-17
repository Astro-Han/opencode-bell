import test from "node:test"
import assert from "node:assert/strict"

// Clean env vars before top-level import to prevent external pollution
delete process.env.OPENCODE_BELL_EVENTS
delete process.env.OPENCODE_BELL_DEBOUNCE
// Default import for regression, debounce, and TTY tests (relies on default config)
const { OpencodeBellPlugin } = await import("../index.js")

// --- 1. Regression: missing event.properties does not throw ---

test("does not throw when event.properties is missing", async () => {
  const plugin = await OpencodeBellPlugin()
  await assert.doesNotReject(
    plugin.event({
      event: { type: "permission.asked" }
    })
  )
})

// --- 2. Env var config: OPENCODE_BELL_EVENTS ---

test("OPENCODE_BELL_EVENTS: only configured event types trigger bell", async (t) => {
  // Module reads env at load time; set before import, use query string to bust cache
  process.env.OPENCODE_BELL_EVENTS = "permission.asked"
  let writeCount = 0

  // Stub: force TTY mode and count write calls
  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    const { OpencodeBellPlugin: PluginFiltered } =
      await import("../index.js?test=events-filter")

    const plugin = await PluginFiltered()

    // Configured event — should ring
    await plugin.event({ event: { type: "permission.asked" } })
    assert.equal(writeCount, 1, "permission.asked should trigger one bell")

    // Unconfigured events — should not ring
    await plugin.event({ event: { type: "question.asked" } })
    await plugin.event({ event: { type: "session.idle" } })
    assert.equal(writeCount, 1, "unconfigured event types should not trigger bell")
  } finally {
    delete process.env.OPENCODE_BELL_EVENTS
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

test("no OPENCODE_BELL_EVENTS: all four default events trigger bell", async (t) => {
  delete process.env.OPENCODE_BELL_EVENTS
  let writeCount = 0

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    // Fresh plugin instance (independent last Map)
    const plugin = await OpencodeBellPlugin()

    const defaultEvents = [
      "permission.asked",
      "question.asked",
      "session.idle",
      "session.error",
    ]
    // Use different sessionIds to avoid debounce
    for (const [i, type] of defaultEvents.entries()) {
      await plugin.event({ event: { type, properties: { sessionID: `s${i}` } } })
    }
    assert.equal(writeCount, 4, "all four default events should each trigger one bell")

    // Non-default event should not trigger
    await plugin.event({ event: { type: "unknown.event", properties: { sessionID: "s99" } } })
    assert.equal(writeCount, 4, "non-default events should not trigger bell")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

// --- 3. Env var config: OPENCODE_BELL_DEBOUNCE ---

test("OPENCODE_BELL_DEBOUNCE: valid number overrides default window", async (t) => {
  process.env.OPENCODE_BELL_DEBOUNCE = "500"
  let writeCount = 0

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    const { OpencodeBellPlugin: PluginDebounce } =
      await import("../index.js?test=debounce-custom")
    const plugin = await PluginDebounce()
    const now = Date.now()

    // Same key, 400ms apart < 500ms window — second call should not ring
    plugin._ring("test-key", now)
    plugin._ring("test-key", now + 400)
    assert.equal(writeCount, 1, "400ms gap within 500ms window should not repeat bell")

    // 600ms apart > 500ms window — third call should ring
    plugin._ring("test-key", now + 600)
    assert.equal(writeCount, 2, "600ms gap exceeds 500ms window, should ring again")
  } finally {
    delete process.env.OPENCODE_BELL_DEBOUNCE
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

test("OPENCODE_BELL_DEBOUNCE=abc: invalid value falls back to default 1200ms", async (t) => {
  process.env.OPENCODE_BELL_DEBOUNCE = "abc"
  let writeCount = 0

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    const { OpencodeBellPlugin: PluginInvalid } =
      await import("../index.js?test=debounce-invalid")
    const plugin = await PluginInvalid()
    const now = Date.now()

    // 1000ms apart < 1200ms default — should not repeat
    plugin._ring("key-abc", now)
    plugin._ring("key-abc", now + 1000)
    assert.equal(writeCount, 1, "1000ms gap within default 1200ms window should not repeat bell")

    // 1300ms apart > 1200ms default — should ring
    plugin._ring("key-abc", now + 1300)
    assert.equal(writeCount, 2, "1300ms gap exceeds default 1200ms window, should ring again")
  } finally {
    delete process.env.OPENCODE_BELL_DEBOUNCE
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

// --- 4. Debounce logic ---

test("debounce: same key within window does not repeat bell", async (t) => {
  let writeCount = 0

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    const plugin = await OpencodeBellPlugin()
    const now = 1000000

    // First call — should ring
    plugin._ring("evt:session1", now)
    assert.equal(writeCount, 1, "first call should ring")

    // 100ms later, same key — within window, should not ring
    plugin._ring("evt:session1", now + 100)
    assert.equal(writeCount, 1, "same key within window should not repeat bell")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

test("debounce: same key rings again after window expires", async (t) => {
  let writeCount = 0

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    const plugin = await OpencodeBellPlugin()
    const now = 2000000

    plugin._ring("evt:session2", now)
    assert.equal(writeCount, 1, "first call should ring")

    // Beyond default 1200ms — should ring again
    plugin._ring("evt:session2", now + 1500)
    assert.equal(writeCount, 2, "same key should ring again after window expires")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

test("debounce: different keys trigger independently", async (t) => {
  let writeCount = 0

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") writeCount++; return true }

  try {
    const plugin = await OpencodeBellPlugin()
    const now = 3000000

    plugin._ring("evt:sessionA", now)
    plugin._ring("evt:sessionB", now + 10)  // Different key, not affected by A's debounce
    assert.equal(writeCount, 2, "different keys should trigger independently")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

// --- 5. TTY guard ---

test("TTY guard: writes BEL when isTTY is true", async (t) => {
  let bellWritten = false

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") bellWritten = true; return true }

  try {
    const plugin = await OpencodeBellPlugin()
    plugin._ring("tty-true-key", Date.now())
    assert.ok(bellWritten, "should write BEL when isTTY is true")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

test("TTY guard: does not write BEL when isTTY is false", async (t) => {
  let bellWritten = false

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  // Stub: simulate non-TTY environment (e.g. piped output)
  Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") bellWritten = true; return true }

  try {
    const plugin = await OpencodeBellPlugin()
    plugin._ring("tty-false-key", Date.now())
    assert.equal(bellWritten, false, "should not write BEL when isTTY is false")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})

test("TTY guard: does not write BEL when isTTY is undefined", async (t) => {
  let bellWritten = false

  const origIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const origWrite = process.stdout.write.bind(process.stdout)
  // Stub: isTTY undefined (some CI or redirect environments)
  Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true })
  process.stdout.write = (data) => { if (data === "\x07") bellWritten = true; return true }

  try {
    const plugin = await OpencodeBellPlugin()
    plugin._ring("tty-undefined-key", Date.now())
    assert.equal(bellWritten, false, "should not write BEL when isTTY is undefined")
  } finally {
    if (origIsTTY) {
      Object.defineProperty(process.stdout, "isTTY", origIsTTY)
    } else {
      delete process.stdout.isTTY
    }
    process.stdout.write = origWrite
  }
})
