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
        //console.log(v, ": Downloaded ", chunk.length, " bytes. Ptr: ", ptr / MB, "CHUNK: ", chunk);
      }
    }
  }
  const writer = (ptr) => new WritableStream(createWriter(0, ptr), new CountQueuingStrategy({ highWaterMark: 10000 }));



  return {
    async downloadToMem(fd, dst_ptr, length, file_offset) {
      //console.log("JS WEAVE_DRIVE: Downloading to mem: ", fd, dst_ptr, length, file_offset)

      var stream = 0;

      for(var i = 0; i < FS.streams.length; i++) {
        if(FS.streams[i].fd === fd) {
          stream = FS.streams[i]
        }
      }

      const url = `${mod.ARWEAVE}/${stream.node.name}`
      const from = file_offset
      const to = file_offset + Number(length)
      //console.log("URL: ", url, " FROM: ", from, " TO: ", to)
      var res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          Connection: 'keep-alive',
          Range: `bytes=${from}-${to}`
        }
      })
      await res.body.pipeTo(writer(Number(dst_ptr)))
      //console.log("Downloaded.")
      return length
    },


    async downloadFile(url, filePath) {
      var bytesLength = await fetch(url, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      var ptr = mod._malloc(bytesLength)
      // console.log("Got ptr for file at:", ptr)
      const response = await fetch(url);
      // console.log("Starting to pipe...")
      await response.body.pipeTo(writer(ptr))
      return Promise.resolve({ ptr, bytes: bytesLength })
    },
    async createLinkFile(id) {
      //var { ptr, bytes } = await this.downloadFile(`${mod.ARWEAVE}/${id}`)
      var properties = { isDevice: false, contents: null };
      // TODO: might make sense to create the `data` folder here if does not exist
      var node = FS.createFile('/', 'data/' + id, properties, true, false);
      //node.ptr = ptr;
      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, {
        usedBytes: {
          get: function () { return bytes; }
        }
      });
      // console.log("NODE stream ops:", Object.keys(node.stream_ops))
      //function readData(stream, heap, dst_ptr, length, file_ptr) {
      //  var srcPtr = stream.node.ptr;
      //  var chunkBytes = heap.subarray(srcPtr + file_ptr, srcPtr + length + file_ptr)
      //  heap.set(chunkBytes, dst_ptr)
      //  return chunkBytes.length
      //}
      // use a custom read function
      //node.stream_ops.read = (stream, buffer, offset, length, position) => {
      //  return readData(stream, buffer, offset, length, position)
      //};
      // use a custom mmap function
      node.stream_ops.mmap = (stream, length, position, prot, flags) => {
        if(!stream.node.ptr) {
          console.log("ERR: MMAP WITHOUT DOWNLOAD. Name:", stream.node.name, " FD:", stream.node.fd)
          return 0;
        }
        var mmap_ptr = stream.node.ptr + position
        console.log(mmap_ptr)
        return { ptr: mmap_ptr, allocated: true };
      };
      return Promise.resolve(node);
    }
  }
}