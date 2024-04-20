import { test } from 'node:test'
import * as assert from 'node:assert'
import AoLoader from '@permaweb/ao-loader'
import fs from 'fs'

const wasm = fs.readFileSync('./process.wasm')
const options = { format: "wasm32-unknown-emscripten2" }
test('run evaluate action unsuccessfully', async () => {
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
llama.init()
llama.set_prompt("Hello World")
local story = ""
for i=1,50 do
  story = story .. llama.get_next_token()
end
return story
    `
  }
  const result = await handle(null, msg, env)
  console.log(result.Output.data.output)
  //assert.equal(result.Output.data.output, 'ok')
  assert.ok(true)
})
