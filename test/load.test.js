import { test } from 'node:test'
import * as assert from 'node:assert'
import AoLoader from '@permaweb/ao-loader'
import fs from 'fs'

function uint8ArrayToBase64(uint8Array) {
  // Convert Uint8Array to a binary string. Each byte is converted to a char.
  const binaryString = new Uint8Array(uint8Array).reduce((acc, byte) => acc + String.fromCharCode(byte), '');

  // Encode the binary string to Base64 using btoa
  return btoa(binaryString);
}

const wasm = fs.readFileSync('AOS.wasm')
const options = { format: "wasm32-unknown-emscripten3", computeLimit: 9e12 }

function loadData(datFile, id, nextId) {
  let data = uint8ArrayToBase64(new Uint8Array(fs.readFileSync(datFile)))
  
  return {
    Target: 'AOS',
    Owner: 'FOOBAR',
    ['Block-Height']: "1000",
    Id: id,
    Module: "WOOPAWOOPA",
    Tags: [
      { name: 'Content-Type', value: 'application/octet-stream' },
      { name: 'Data-Protocol', value: 'Onchain-Llama' },
      { name: 'Type', value: 'Model-Chunk' },
      { name: 'Next', value: nextId },
      { name: 'Model-Size', value: '60816028' },
      { name: 'Tokenizer-Size', value: '432717' }
    ],
    Data: data
  }
}

function loadTokenizer(datFile, id) {
    let data = uint8ArrayToBase64(new Uint8Array(fs.readFileSync(datFile)))
    
    return {
      Target: 'AOS',
      Owner: 'FOOBAR',
      ['Block-Height']: "1000",
      Id: id,
      Module: "WOOPAWOOPA",
      Tags: [
        { name: 'Content-Type', value: 'application/octet-stream' },
        { name: 'Data-Protocol', value: 'Onchain-Llama' },
        { name: 'Type', value: 'Tokenizer' },
        { name: 'Model-Size', value: '60816028' },
        { name: 'Tokenizer-Size', value: '432717' }
      ],
      Data: data
    }
  }

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

    return llama.loadModel('m9ibqUzBAwc8PXgMXHBw5RP_TR-Ra3vJnt90RTTuuLg', function () print("Loaded") end)
    `
  }
  let result = await handle(null, msg, env)
  //assert.equal(result, [])
  console.log(result.Assignments)
  assert.deepEqual(result.Assignments, [{
    Processes: [
      'AOS'
    ], Message: 'm9ibqUzBAwc8PXgMXHBw5RP_TR-Ra3vJnt90RTTuuLg'
  }])
  assert.equal('ok', 'ok')
  
  global.gc()

  result = await handle(
    result.Memory, 
    loadData('./1.dat', 'm9ibqUzBAwc8PXgMXHBw5RP_TR-Ra3vJnt90RTTuuLg', 'wtl94hMrEoDt3cpPVIJjmvtbexZWDTg1BBEP3ZZOGaE'),
    env
  )
  
  //console.log(result2)
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    loadData('./2.dat', 'wtl94hMrEoDt3cpPVIJjmvtbexZWDTg1BBEP3ZZOGaE', 'OGKHBqyZHVj8rFqFipwVs5pgHQRRnaXrHiThZkkppnM'),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')
 

  result = await handle(
    result.Memory,
    loadData('./3.dat', 'OGKHBqyZHVj8rFqFipwVs5pgHQRRnaXrHiThZkkppnM', 'wHe6fX12v-PefoiCByxvUx11YmxFtC_Cj-NhLOMi4Ls'),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')
 
  result = await handle(
    result.Memory,
    loadData('./4.dat', 'wHe6fX12v-PefoiCByxvUx11YmxFtC_Cj-NhLOMi4Ls', 'hJmLSlQcTJzj0pBUWIvMA0T26XqNyTzSQjULPtPKAPY'),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    loadData('./5.dat', 'hJmLSlQcTJzj0pBUWIvMA0T26XqNyTzSQjULPtPKAPY', 'Qi91unaKVotbu1rQzRV7D6MhMOt89wpCxhMSL7qfLPg'),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')
  
  result = await handle(
    result.Memory,
    loadData('./6.dat', 'Qi91unaKVotbu1rQzRV7D6MhMOt89wpCxhMSL7qfLPg', 'SeiXJ7oScUMiBVVQENUjYdvtNHsuEDIu9r1zdk2cFCs'),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')
  
  result = await handle(
    result.Memory,
    loadTokenizer('./7.dat', 'SeiXJ7oScUMiBVVQENUjYdvtNHsuEDIu9r1zdk2cFCs'),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

})
