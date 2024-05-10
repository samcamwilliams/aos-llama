var assert = require('assert')
const KB = 1024
const MB = KB * 1024
const GB = MB * 1024
const CACHE_SZ = 128 * MB

module.exports = function weaveDrive(mod, FS) {
  const createWriter = (v, stream, ptr, length) => {
    return {
      write(chunk) {
        // Calculate the chunk to write to the memory provided
        var write_chunk = chunk.subarray(0, Math.min(chunk.length, length))
        // Write it into memory (even if length is zero) and update pointers
        //console.log("WEAVE_DRIVE WRITER: Writing chunk: ", write_chunk.length, " to ptr: ", ptr, " Remaining to write: ", length)
        mod.HEAP8.set(new Uint8Array(write_chunk), ptr)
        ptr += write_chunk.length;
        length -= write_chunk.length
        v++
        if(length === 0) {
          // Store the rest of the request into the cache
          var cache_chunk = chunk.subarray(write_chunk.length)
          console.log("WEAVE_DRIVE WRITER: Caching bytes: ", cache_chunk.length)
          // Create a new Uint8Array with the size of the existing cache plus the new chunk
          var new_cache = new Uint8Array(stream.node.cache.length + cache_chunk.length)
          // Set the existing cache into the new array
          new_cache.set(stream.node.cache)
          new_cache.set(cache_chunk, stream.node.cache.length)
          // Replace the old cache with the new cache
          stream.node.cache = new_cache
        }
      }
    }
  }
  const writer = (stream, ptr, length) =>
    new WritableStream(createWriter(0, stream, ptr, length), new CountQueuingStrategy({ highWaterMark: 1 }));



  return {
    async downloadToMem(fd, raw_dst_ptr, raw_length, file_offset) {
      var length = Number(raw_length)
      var dst_ptr = Number(raw_dst_ptr)
      //console.log("WEAVE_DRIVE: Downloading to mem: ", fd, dst_ptr, length, file_offset)

      var stream = 0;
      for(var i = 0; i < FS.streams.length; i++) {
        if(FS.streams[i].fd === fd) {
          stream = FS.streams[i]
        }
      }

      // Take bytes from the cache first, if we can
      var cache_part_length = Math.min(length, stream.node.cache.length)
      var cache_part = stream.node.cache.subarray(0, cache_part_length)
      mod.HEAP8.set(cache_part, Number(dst_ptr))
      // Set the new cache to the rest of the cache and update pointers
      stream.node.cache = stream.node.cache.subarray(cache_part_length)
      dst_ptr += cache_part_length
      file_offset += cache_part_length
      length -= cache_part_length

      //console.log("WEAVE_DRIVE: Got bytes from cache: ", cache_part_length, " Remaining to get: ", length, "Current cache size: ", stream.node.cache.length)

      // Return if we have satisfied the request
      if(length === 0) {
        //console.log("WEAVE_DRIVE: Satisfied request with cache. Returning...")
        return length
      }

      // If we have no cache, or we have not satisfied the full request, we need to download the rest
      const url = `${mod.ARWEAVE}/${stream.node.name}`
      const from = file_offset
      const chunk_download_sz = Math.max(length, CACHE_SZ)
      const to = Math.min(stream.node.total_size, file_offset + chunk_download_sz - 1);
      console.log("WEAVE_DRIVE: Downloading: ", url, " From: ", from, " To: ", to, " Read length: ", length, " Readahead cache length:", to - length - file_offset)
      var res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          Connection: 'keep-alive',
          Range: `bytes=${from}-${to}`
        }
      })

      // Create a readable stream from the response with a higher highWaterMark
      const reader = res.body.getReader();
      const readStream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          console.log("WEAVE_DRIVE: Read " + value.length + " bytes.")
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        }
      }, { highWaterMark: 10 * 1024 * 1024 }); // Set to 10MB, adjust as needed

      // Pipe the new stream to the writer
      await readStream.pipeTo(writer(stream, Number(dst_ptr), length));

      //await res.body.pipeTo(writer(stream, Number(dst_ptr), length))
      console.log("WEAVE_DRIVE: Downloaded " + length + " bytes. Cache length: " + stream.node.cache.length)
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
      var bytesLength = await fetch(`${mod.ARWEAVE}/${id}`, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      node.total_size = Number(bytesLength)
      node.cache = new Uint8Array(0)
      //node.ptr = ptr;
      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, {
        usedBytes: {
          get: function () { return bytesLength; },

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