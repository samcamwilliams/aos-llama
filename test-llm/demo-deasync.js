var loop = require('deasync').runLoopOnce

function awaitSync(p) {
  var done = null;
  var result = null;
  p().then((r) => {
    done = true;
    result = r;
  });
  while (!done) {
    loop()
  }
  return result
}

function main() {
  return awaitSync(() => fetch('https://arweave.net/XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY', {
    method: 'GET',
    headers: {
      'Range': 'bytes=0-1000'
    }
  }).then(res => res.arrayBuffer())
  )
}

console.log(new Uint8Array(main()))