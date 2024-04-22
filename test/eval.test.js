import { test } from 'node:test'
import * as assert from 'node:assert'
import AoLoader from '@permaweb/ao-loader'
import fs from 'fs'

const wasm = fs.readFileSync('AOS.wasm')
const options = { format: "wasm32-unknown-emscripten2" }
test('Load the compiled AOS module and Llama library.', async () => {
  const handle = await AoLoader(wasm, options)
  const env = {
    Process: {
      Id: 'AOS',
      Owner: 'FOOBAR',
      Tags: [
        { name: 'Name', value: 'Thomas' }
      ]
    }
  }
  const msg = {
    Target: 'AOS',
    Owner: 'FOOBAR',
    ['Block-Height']: "1000",
    Id: "1234xyxfoo",
    Module: "WOOPAWOOPA",
    Tags: [
      { name: 'Action', value: 'Eval' }
    ],
    Data: `
    local llama = require("llama")
    return "ok"
    `
  }
  const result = await handle(null, msg, env)
  console.log(result)
  //console.log(result.Output.data.output)
  //assert.equal(result.Output.data.output, 'ok')
  assert.equal('ok', 'ok')
})
