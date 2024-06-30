const { describe, it } = require('node:test')
const assert = require('assert')
const weaveDrive = require('./weavedrive.js')
const fs = require('fs')
const wasm = fs.readFileSync('./AOS.wasm')
// STEP 1 send a file id
const m = require(__dirname + '/AOS.js')
const AdmissableList =
  [
    "dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8", // Random NFT metadata (1.7kb of JSON)
    "XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY", // GPT-2 117M model.
    "M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc", // GPT-2-XL 4-bit quantized model.
    "kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo", // Phi-2 
    "ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo", // Phi-3 Mini 4k Instruct
    "sKqjvBbhqKvgzZT4ojP1FNvt4r_30cqjuIIQIr-3088", // CodeQwen 1.5 7B Chat q3
    "Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA", // Llama3 8B Instruct q4
    "jbx-H6aq7b3BbNCHlK50Jz9L-6pz9qmldrYXMwjqQVI"  // Llama3 8B Instruct q8
  ]

describe('AOS-Llama+VFS Tests', async () => {
  var instance;
  const handle = async function (msg, env) {
    const res = await instance.cwrap('handle', 'string', ['string', 'string'], { async: true })(JSON.stringify(msg), JSON.stringify(env))
    console.log('Memory used:', instance.HEAP8.length)
    return JSON.parse(res)
  }

  it('Create instance', async () => {
    console.log("Creating instance...")
    var instantiateWasm = function (imports, cb) {

      // merge imports argument
      const customImports = {
        env: {
          memory: new WebAssembly.Memory({ initial: 8589934592 / 65536, maximum: 17179869184 / 65536, index: 'i64' })
        }
      }
      //imports.env = Object.assign({}, imports.env, customImports.env)

      WebAssembly.instantiate(wasm, imports).then(result =>

        cb(result.instance)
      )
      return {}
    }

    instance = await m({
      admissableList: AdmissableList,
      WeaveDrive: weaveDrive,
      ARWEAVE: 'https://arweave.net',
      mode: "test",
      blockHeight: 100,
      spawn: {
        "Scheduler": "TEST_SCHED_ADDR"
      },
      process: {
        id: "TEST_PROCESS_ID",
        owner: "TEST_PROCESS_OWNER",
        tags: [
          { name: "Extension", value: "Weave-Drive" }
        ]
      },
      instantiateWasm
    })
    await new Promise((r) => setTimeout(r, 1000));
    console.log("Instance created.")
    await new Promise((r) => setTimeout(r, 250));

    assert.ok(instance)
  })

  it('Eval Lua', async () => {
    console.log("Running eval")
    const result = await handle(getEval('1 + 1'), getEnv())
    console.log("Eval complete")
    assert.equal(result.response.Output.data.output, 2)
  })

  it('Add data to the VFS', async () => {
    await instance['FS_createPath']('/', 'data')
    await instance['FS_createDataFile']('/', 'data/1', Buffer.from('HELLO WORLD'), true, false, false)
    const result = await handle(getEval('return "OK"'), getEnv())
    assert.ok(result.response.Output.data.output == "OK")
  })

  it.skip('Read data from the VFS', async () => {
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

  it.skip('Read data from Arweave', async () => {
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
local Llama = require("llama")
--llama.load("/data/ggml-tiny.en.bin")
return Llama.info()
`), getEnv())
    assert.ok(result.response.Output.data.output == "Decentralized llama.cpp.")
  })

  it.skip('AOS runs GPT-2-XL model', async () => {
    const result = await handle(getEval(`
  local Llama = require("llama")
  io.stderr:write([[Loading model...\n]])
  local result = Llama.load("/data/M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc")
  io.stderr:write([[Loaded! Setting prompt 1...\n]])
  Llama.setPrompt("Once upon a time")
  io.stderr:write([[Prompt set! Running...\n]])
  local str = Llama.run(30)
  return str
  `), getEnv())
    console.log("START SECOND MESSAGE")
    const result2 = await handle(getEval(`
    Llama.setPrompt("How do you feel about rabbits? ")
    io.stderr:write([[Prompt set! Running 2...\n]])
    local str = Llama.run(30)
    return str
    `), getEnv())
    console.log(result.response)
    console.log(result)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS runs GPT-2 1.5b model', async () => {
    const result = await handle(
      getLua('M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc', 10),
      getEnv())
    console.log(result.response)
    console.log("SIZE:", instance.HEAP8.length)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS loads Phi-2', async () => {
    const result = await handle(getEval(`
  local Llama = require("llama")
  Llama.load('/data/kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo')
  --Llama.setPrompt([[<|user|>Can you write a HelloWorld function in js<|end|><|assistant|>]])
  return Llama.run(10)
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('Can add tokens into context', async () => {
    const result = await handle(getEval(`
  local Llama = require("llama")
  Llama.load('/data/ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo')
  Llama.setPrompt([[<|user|>Tell me a great story<|assistant|>]])
  local str = ""
  for i = 0, 100, 1 do
    str = str .. Llama.next()
    io.stderr:write([[Str: ]] .. str .. [[\n]])
    io.stderr:flush()
    if i % 30 == 0 then
      Llama.add("dog")
      str = str .. "dog"
    end
  end
  return str
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS runs Phi-3 Mini 4k Instruct', async () => {
    const result = await handle(getEval(`
local Llama = require("llama")
Llama.load('/data/ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo')
Llama.setPrompt([[<|user|>Tell me a story.<|end|><|assistant|>]])
return Llama.run(80) 
  `), getEnv())
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it("AOS runs Phi-3 Mini 4k Instruct with saveState/loadState", async () => {
    const result = await handle(
      getEval(`
local Llama = require("llama")
Llama.load('/data/ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo')
Llama.setPrompt([[<|system|>You are the Llama King of Llama Land, with a harsh and eccentric personality.
You must grade the quality of the user's plea for Llama Coin, 0-5. This will be used to calculate how much Llama Coin they receive.
IMPORTANT: ALWAYS respond in the following json format:
{
  "response": "<brief response>",
  "grade": 0
}<|end|>
<|user|>
]])
Llama.saveState()
Llama.add([[Dear Llama King, I am the most loyal subject of the Llama kingdom and will use the coin to promote the interests of Llama land around the world.<|end|>
<|assistant|>]])
local res1 = Llama.run(40)
Llama.loadState()
Llama.add([[I am an antisocial Llama who will surely waste the coin on myself.<|end|>
<|assistant|>]])
local res2 = Llama.run(50)
return res1 .. ' || ' .. res2
  `),
      getEnv()
    );
    console.log(result);
    console.log(result?.response);
    console.log(result?.response?.Output?.data?.output);
    assert.ok(result.response.Output.data.output.length > 10);
  });

  it.skip('AOS runs Llama3 8B Instruct q4', async () => {
    const result =
      await handle(
        getLua('Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA',
          100,
          "<|user|>Tell me a story.<|end|><|assistant|>"),
        getEnv()
      )
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length >= 100)
  })

  it.skip('AOS runs Llama3 8B Instruct q8', async () => {
    const result =
      await handle(
        getLua('jbx-H6aq7b3BbNCHlK50Jz9L-6pz9qmldrYXMwjqQVI',
          10,
          "<|user|>Tell me a story.<|end|><|assistant|>"),
        getEnv()
      )
    console.log(result.response)
    assert.ok(result.response.Output.data.output.length > 10)
  })

  it.skip('AOS runs CodeQwen intelligence test', async () => {
    const result =
      await handle(
        getEval(readFileSync("code-test.lua", "utf-8")),
        getEnv()
      )
    console.log(result.response)
    assert.ok(result.response.Output.data.output.includes("<|im_end|>"))
  })
})

function getLua(model, len, prompt) {
  if (!prompt) {
    prompt = "Tell me a story."
  }
  return getEval(`
  local Llama = require("llama")
  io.stderr:write([[Loading model...\n]])
  Llama.load('/data/${model}')
  io.stderr:write([[Loaded! Setting prompt...\n]])
  Llama.setPrompt([[${prompt}]])
  local result = ""
  io.stderr:write([[Running...\n]])
  for i = 0, ${len.toString()}, 1 do
    local token = Llama.next()
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