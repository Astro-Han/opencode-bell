import test from "node:test"
import assert from "node:assert/strict"

import { OpencodeBellPlugin } from "../index.js"

test("does not throw when event.properties is missing", async () => {
  const plugin = await OpencodeBellPlugin()
  await assert.doesNotReject(
    plugin.event({
      event: { type: "permission.asked" }
    })
  )
})
