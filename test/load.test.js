import { test } from 'node:test'
import * as assert from 'node:assert'
import AoLoader from '@permaweb/ao-loader'
import fs from 'fs'
import { getDataItem } from './get-dataitem.js'

describe('AOS-Llama tests.', function() {
  this.timeout(0); // Where we're going, we don't need timeouts...
  // Optionally specify a model on the command line, or use this copy of 
  // 'TinyStories-15m', as trained by @Karpathy.
  // Another option is the TinyStories-110m model, also trained by @Karpathy.
  // Its ID is: ux3qjxwCD2WArH4C13UKePifhKB3AoxhfJTy_Cbxt8M
  const LLAMA_MODEL_ID = process.env.MODEL || 'm9ibqUzBAwc8PXgMXHBw5RP_TR-Ra3vJnt90RTTuuLg'
  const LLAMA_PROMPT = 'Hello World'
  const LLAMA_TOKENS = 10
  const options = { format: "wasm32-unknown-emscripten3", computeLimit: 9e15 }

  console.log("Loading AOS WASM image created at:", new Date(fs.statSync('AOS.wasm').mtime).toISOString())
  const wasm = fs.readFileSync('AOS.wasm')
  console.log("WASM image loaded. Size:", (wasm.length / 1024 / 1024).toFixed(2), " MB")
  console.log("WASM module format:", options.format)
  console.log("WASM module compute limit:", options.computeLimit)

  const env = {
    Process: {
      Id: 'AOS',
      Owner: 'FOOBAR',
      Tags: [
        { name: 'Name', value: 'Test Llama Model Process' }
      ]
    }
  }

  it('TEST_LOAD: Prepare the AOS module and Llama library.', async () => {
    console.log("Loading model ID:", LLAMA_MODEL_ID)
    let total_gas = 0

    const handle = await AoLoader(wasm, options)

    let result = await handle(null, {
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

          llama.loadModel('${LLAMA_MODEL_ID}', function () print("Model Loaded") end)

          return llama.info()
          `
        },
        env
    )

    console.log(result)

    total_gas += result.GasUsed

    while (result.Assignments.length > 0) {
      console.log("Loading data item:", result.Assignments[0].Message)
      let di = await getDataItem(result.Assignments[0].Message);
      console.log("Running process over the message...")
      result = await handle(result.Memory, di, env);
      console.log("Memory used:", + result.Memory.length, ". Gas used: ", + result.GasUsed)
      total_gas += result.GasUsed
    }

    console.log("Load complete. Total gas used:", total_gas)

    assert.equal(result.Output.data, 'Model Loaded')

    console.log("Writing memory to disk...")
    fs.writeFileSync('.cache/initialized_memory.bin', result.Memory);

    console.log("Memory file written to disk. Size:", + result.Memory.length / 1024 / 1024, " MB");
  })

  it('TEST_INFERENCE: Run inference using the prepared context.', async () => {
    assert.ok(fs.existsSync('.cache/initialized_memory.bin'), "Memory file does not exist. Must run TEST_LOAD first to generate it.")
    const Memory = fs.readFileSync('.cache/initialized_memory.bin');
    const handle = await AoLoader(wasm, options);
    console.log("Loading memory image created at:", new Date(fs.statSync('.cache/initialized_memory.bin').mtime).toISOString());
    console.log("Loaded process memory. Size:", Memory.length / 1024 / 1024, " MB");
    console.log("Running inference on prompt: \"", LLAMA_PROMPT, "\". Tokens:", LLAMA_TOKENS)

    let result = await handle(
      Memory,
      {
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
    
        llama.setPrompt('${LLAMA_PROMPT}')
        return llama.generate(${LLAMA_TOKENS})
        `
      },
      env
    )

    console.log("LLM inference result:", result.Output.data.output)
    console.log("Final memory used:", + result.Memory.length, ". Gas used in inference: ", + result.GasUsed)
    assert.ok(result.Output.data.output)
  })
})

