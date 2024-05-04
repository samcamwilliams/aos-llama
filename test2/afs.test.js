const { describe, it } = require('node:test')
const assert = require('assert')
// VFS-1
// STEP 1 send a file id
const m = require('./AOS.js')

describe('vfs-1 test', async () => {
  const instance = await m()
  const handle = function (msg, env) {
    return JSON.parse(
      instance.cwrap('handle', 'string', ['string', 'string'])(JSON.stringify(msg), JSON.stringify(env))
    )
  }

  it('should send eval successfully', () => {
    const result = handle(getEval('1 + 1'), getEnv())
    assert.equal(result.response.Output.data.output, 2)
  })

  it('should send data successfully', () => {
    // instance.FS.mkdirTree('/afs/data')
    // instance.FS.writeFile('/afs/data/1.bin', Buffer.from('HELLOWORLD'))
    // see if directory exits
    const result = handle(getData(), getEnv())
    assert.ok(result.ok)
  })

  it('should list files via eval', () => {
    const result = handle(getEval(`
local file = io.open("/afs/data/1.bin", "r")
local output = "Hello"
if file then
  local content = file:read("*a")    
  output = content
  file:close()
else
  return "Failed to open the file"
end
return output   
    `), getEnv())
    console.log(result.response.Output.data)
    assert.ok(true)
  })
})

function getData() {
  return {
    Id: '1',
    Owner: 'TOM',
    Module: 'FOO',
    'Block-Height': '1001',
    Timestamp: Date.now(),
    From: 'foo',
    Tags: [
      { name: 'Content-Type', value: 'application/octet-stream' }
    ]
  }
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