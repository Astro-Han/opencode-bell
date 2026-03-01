import test from "node:test"
import assert from "node:assert/strict"

import { OpencodeBellPlugin } from "../index.js"

const withStdoutStub = async ({ isTTY = true }, run) => {
  const originalWrite = process.stdout.write
  const originalDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  const writes = []

  process.stdout.write = (chunk) => {
    writes.push(chunk)
    return true
  }
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: isTTY
  })

  try {
    await run(writes)
  } finally {
    process.stdout.write = originalWrite
    if (originalDescriptor) {
      Object.defineProperty(process.stdout, "isTTY", originalDescriptor)
    }
  }
}

const withMockedNow = async (times, run) => {
  const originalNow = Date.now
  let index = 0

  Date.now = () => {
    const value = times[index]
    index += 1
    return value
  }

  try {
    await run()
  } finally {
    Date.now = originalNow
  }
}

test("does not throw when event.properties is missing", async () => {
  const plugin = await OpencodeBellPlugin()
  await assert.doesNotReject(
    plugin.event({
      event: { type: "permission.asked" }
    })
  )
})

test("rings once for each supported event type", async () => {
  const plugin = await OpencodeBellPlugin()

  await withStdoutStub({ isTTY: true }, async (writes) => {
    await plugin.event({ event: { type: "permission.asked" } })
    await plugin.event({ event: { type: "question.asked" } })
    await plugin.event({ event: { type: "session.idle" } })
    await plugin.event({ event: { type: "session.error" } })

    assert.equal(writes.length, 4)
    assert.deepEqual(writes, ["\x07", "\x07", "\x07", "\x07"])
  })
})

test("does not ring for unsupported event types", async () => {
  const plugin = await OpencodeBellPlugin()

  await withStdoutStub({ isTTY: true }, async (writes) => {
    await plugin.event({ event: { type: "session.started" } })
    assert.equal(writes.length, 0)
  })
})

test("does not ring when stdout is not a TTY", async () => {
  const plugin = await OpencodeBellPlugin()

  await withStdoutStub({ isTTY: false }, async (writes) => {
    await plugin.event({ event: { type: "session.idle" } })
    assert.equal(writes.length, 0)
  })
})

test("debounces repeated events within 1200ms for the same key", async () => {
  const plugin = await OpencodeBellPlugin()

  await withStdoutStub({ isTTY: true }, async (writes) => {
    await withMockedNow([2000, 2500, 3301], async () => {
      await plugin.event({ event: { type: "permission.asked" } })
      await plugin.event({ event: { type: "permission.asked" } })
      await plugin.event({ event: { type: "permission.asked" } })
    })

    assert.equal(writes.length, 2)
  })
})

test("uses session-specific debounce keys", async () => {
  const plugin = await OpencodeBellPlugin()

  await withStdoutStub({ isTTY: true }, async (writes) => {
    await withMockedNow([2000, 2100], async () => {
      await plugin.event({
        event: {
          type: "permission.asked",
          properties: { sessionID: "A" }
        }
      })
      await plugin.event({
        event: {
          type: "permission.asked",
          properties: { sessionID: "B" }
        }
      })
    })

    assert.equal(writes.length, 2)
  })
})
