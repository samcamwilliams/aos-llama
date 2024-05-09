var deasyncPromise = require('deasync-promise')
var assert = require('assert')
const MB = (1024 * 1024)
const GB = 1000 * MB
const CHUNK_SZ = 100 * MB

module.exports = function weaveDrive(mod, FS) {
  const createWriter = (v, ptr) => {
    return {
      write(chunk) {
        mod.HEAP8.set(new Uint8Array(chunk), ptr)
        ptr += chunk.length;
        v++
        if (v % 10000 === 0) {
          console.log("Downloaded: ", ptr / MB);
        }
      }
    }
  }
  const writer = (ptr) => new WritableStream(createWriter(0, ptr), new CountQueuingStrategy({ highWaterMark: 10000 }));

  const fetchRange = (url, from, to) => fetch(url, {
    headers: {
      Connection: 'keep-alive',
      Range: `bytes=${from}-${to}`
    }
  })

  return {
    async downloadFiles(url, filePath) {
      var bytesLength = await fetch(url, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      var ptr = mod._malloc(bytesLength)
      // console.log("Got ptr for file at:", ptr)
      const response = await fetch(url);
      // console.log("Starting to pipe...")
      await response.body.pipeTo(writer(ptr))
      return Promise.resolve({ ptr, bytes: bytesLength })
    },
    async createLinkFile(id) {
      var { ptr, bytes } = await this.downloadFiles(`${mod.ARWEAVE}/${id}`)
      var properties = { isDevice: false, contents: null };
      // TODO: might make sense to create the `data` folder here if does not exist
      var node = FS.createFile('/', 'data/' + id, properties, true, false);
      node.ptr = ptr;
      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, {
        usedBytes: {
          get: function () { return bytes; }
        }
      });
      function readData(stream, heap, dst_ptr, length, file_ptr) {
        var srcPtr = stream.node.ptr;
        var chunkBytes = heap.subarray(srcPtr + file_ptr, srcPtr + length + file_ptr)
        heap.set(chunkBytes, dst_ptr)
        return chunkBytes.length
      }
      // use a custom read function
      node.stream_ops.read = (stream, buffer, offset, length, position) => {
        return readData(stream, buffer, offset, length, position)
      };
      // use a custom mmap function
      node.stream_ops.mmap = (stream, length, position, prot, flags) => {
        var ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        readData(stream, HEAP8, ptr, length, position);
        return { ptr, allocated: true };
      };
      return Promise.resolve(node);
    }
  }
}