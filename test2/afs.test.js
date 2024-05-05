const { describe, it } = require('node:test')
const assert = require('assert')
// VFS-1
// STEP 1 send a file id
const m = require(__dirname + '/AOS.js')
const AdmissableList =
  [
    "dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8", // Random NFT metadata (1.7kb of JSON)
    "XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY", // GPT-2 117M model.
    "M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc" // GPT-2-XL 4-bit quantized model.
  ]

describe('vfs-1 test', async () => {
  var instance;
  const handle = async function (msg, env) {
    const res = await instance.cwrap('handle', 'string', ['string', 'string'], { async: true })(JSON.stringify(msg), JSON.stringify(env))

    return JSON.parse(res)
  }

  it('Create instance', async () => {
    console.log("Creating instance...")
    instance = await m({admissableList: AdmissableList})
    await new Promise((r) => setTimeout(r, 1000));
    console.log("Instance created...")
    await new Promise((r) => setTimeout(r, 250));
    assert.ok(instance)
  })

  it('Eval Lua', async () => {
    const result = await handle(getEval('1 + 1'), getEnv())
    assert.equal(result.response.Output.data.output, 2)
  })

  it('Add data to the FS', async () => {
    await instance['FS_createPath']('/', 'data')
    await instance['FS_createDataFile']('/', 'data/1', Buffer.from('HELLO WORLD'), true, false, false)
    // see if directory exists
    const result = await handle(getEval('return "OK"'), getEnv())
    assert.ok(result.response.Output.data.output == "OK")
  })

  it('Read data from the FS', async () => {
    const result = await handle(getEval(`
local file = io.open("/data/1", "r")
if file then
  local content = file:read("*a")
  output = content
  file:close()
else
  return "Failed to open the file"
end
return output`), getEnv())
    assert.ok(result.response.Output.data.output == "HELLO WORLD")
  })

  it('Read data from Arweave', async () => {
    const result = await handle(getEval(`
local file = io.open("/data/dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8", "r")
if file then
  local content = file:read("*a")
  file:close()
  return string.sub(content, 1, 10)
else
  return "Failed to open the file"
end`), getEnv())
    assert.ok(result.response.Output.data.output.length == 10)
  })

  it('Llama Lua library loads', async () => {
    const result = await handle(getEval(`
local llama = require("llama")
--llama.load("/data/ggml-tiny.en.bin")
return llama.info()
`), getEnv())
    assert.ok(result.response.Output.data.output == "Decentralized llama.cpp.")
  })


  it('Llama loads GPT-2 1.5b model', async () => {
    const result = await handle(getEval(`
  local llama = require("llama")
  local result = llama.load("/data/M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc")
  llama.setPrompt("Welcome to reality.")
  return llama.run(100)
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length == 10)
  })
})

function getEval(expr) {
  return {
    Id: '1',
    Owner: 'TOM',
    Module: 'FOO',
    From: 'foo',
    'Block-Height': '1000',
    Timestamp: Date.now(),
    Tags: [
      { name: 'Action', value: 'Eval' }
    ],
    Data: expr
  }
}

function getEnv() {
  return {
    Process: {
      Id: 'AOS',
      Owner: 'TOM',
      Tags: [
        { name: 'Name', value: 'Thomas' }
      ]
    }
  }
}