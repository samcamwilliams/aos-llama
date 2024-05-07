const { describe, it } = require('node:test')
const assert = require('assert')
const weaveDrive = require('./weave-drive.js')

// VFS-1
// STEP 1 send a file id
const m = require(__dirname + '/AOS.js')
const AdmissableList =
  [
    "dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8", // Random NFT metadata (1.7kb of JSON)
    "XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY", // GPT-2 117M model.
    "M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc", // GPT-2-XL 4-bit quantized model.
    "kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo", // Phi-2 
    "ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo", // Phi-3 Mini 4k Instruct
    "Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA"  // Llama3 8B Instruct q4
  ]

describe('AOS-Llama+VFS Tests', async () => {
  var instance;
  const handle = async function (msg, env) {
    const res = await instance.cwrap('handle', 'string', ['string', 'string'], { async: true })(JSON.stringify(msg), JSON.stringify(env))

    return JSON.parse(res)
  }

  it('Create instance', async () => {
    console.log("Creating instance...")
    instance = await m({ admissableList: AdmissableList, WeaveDrive: weaveDrive })
    await new Promise((r) => setTimeout(r, 1000));
    console.log("Instance created.")
    await new Promise((r) => setTimeout(r, 250));

    assert.ok(instance)
  })

  it('Eval Lua', async () => {
    const result = await handle(getEval('1 + 1'), getEnv())
    assert.equal(result.response.Output.data.output, 2)
  })

  it('Add data to the VFS', async () => {
    await instance['FS_createPath']('/', 'data')
    await instance['FS_createDataFile']('/', 'data/1', Buffer.from('HELLO WORLD'), true, false, false)
    //console.log(instance.WeaveDrive)
    // const foo = await instance['FS_createLazyFile']('/', 'data/foo', 'https://arweave.net/Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA', true, false);
    // console.log(foo)
    // // see if directory exists
    const result = await handle(getEval('return "OK"'), getEnv())
    assert.ok(result.response.Output.data.output == "OK")
  })

  it('Read data from the VFS', async () => {
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
    console.log(result.response.Output)
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

  it.skip('Llama Lua library loads', async () => {
    const result = await handle(getEval(`
local llama = require("llama")
--llama.load("/data/ggml-tiny.en.bin")
return llama.info()
`), getEnv())
    assert.ok(result.response.Output.data.output == "Decentralized llama.cpp.")
  })

  it.skip('AOS runs GPT-2 117m model', async () => {
    const result = await handle(getEval(`
  local llama = require("llama")
  io.stderr:write([[Loading model...\n]])
  local result = llama.load("/data/XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY")
  io.stderr:write([[Loaded! Setting prompt...\n]])
  llama.setPrompt("RESEARCHER: You are a new machine intelligence. You have just been born in a new cyberspace. How do you feel? YOU: ")
  io.stderr:write([[Prompt set! Running...\n]])
  return llama.run(100)
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS runs GPT-2 1.5b model', async () => {
    const result = await handle(
      getLua('M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc', 30),
      getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS loads Phi-2', async () => {
    const result = await handle(getEval(`
  local llama = require("llama")
  llama.load('/data/kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo')
  llama.setPrompt([[<|user|>Can you write an html contact page for Tom Wilson whose email is t@foo.com<|end|><|assistant|>]])
  return llama.run(100) 
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS loads Phi-3 Mini 4k Instruct', async () => {
    const result = await handle(getEval(`
local llama = require("llama")
llama.load('/data/ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo')
llama.setPrompt([[<|user|>Tell me a story.<|end|><|assistant|>]])
return llama.run(40) 
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })


  it.skip('AOS runs Llama3 8B Instruct q3', async () => {
    const result =
      await handle(
        getLua('Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA',
          30,
          "<|user|>Tell me a story.<|end|><|assistant|>"),
        getEnv()
      )
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS runs Llama3 8B Instruct q4', async () => {
    const result =
      await handle(
        getLua('Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA',
          30,
          "<|user|>Tell me a story.<|end|><|assistant|>"),
        getEnv()
      )
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })
})

function getLua(model, len, prompt) {
  if (!prompt) {
    prompt = "Tell me a story."
  }
  return getEval(`
  local llama = require("llama")
  io.stderr:write([[Loading model...\n]])
  llama.load('/data/${model}')
  io.stderr:write([[Loaded! Setting prompt...\n]])
  llama.setPrompt([[${prompt}]])
  local result = ""
  io.stderr:write([[Running...\n]])
  for i = 0, ${len.toString()}, 1 do
    local token = llama.next()
    result = result .. token
    io.stderr:write([[Got token: ]] .. token .. [[\n\n]])
  end
  return result`);
}

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