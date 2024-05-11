var assert = require('assert')
const KB = 1024
const MB = KB * 1024
const CACHE_SZ = 32 * KB
const CHUNK_SZ = 128 * MB
const NOTIFY_SZ = 512 * MB

module.exports = function weaveDrive(mod, FS) {
  return {
    reset(fd) {
      console.log("WEAVE_DRIVE: Resetting fd: ", fd)
      FS.streams[fd].node.position = 0
      FS.streams[fd].node.cache = new Uint8Array(0)
    },

    readFromCache(stream, dst_ptr, length) {
      // Check if the cache has been invalidated by a seek
      if(stream.lastReadPosition !== stream.position) {
        console.log("WEAVE_DRIVE: Invalidating cache for fd: ", stream.fd, " Current pos: ", stream.position, " Last read pos: ", stream.lastReadPosition)
        stream.node.cache = new Uint8Array(0)
        return 0
      }
      // Calculate the bytes of the request that can be satisfied with the cache
      var cache_part_length = Math.min(length, stream.node.cache.length)
      var cache_part = stream.node.cache.subarray(0, cache_part_length)
      mod.HEAP8.set(cache_part, dst_ptr)
      // Set the new cache to the remainder of the unused cache and update pointers
      stream.node.cache = stream.node.cache.subarray(cache_part_length)

      return cache_part_length
    },

    addChunksToCache(old_cache, chunks) {
      // Make a new cache array of the old cache length + the sum of the chunk lengths, capped by the max cache size
      var new_cache_length = Math.min(old_cache.length + chunks.reduce((acc, chunk) => acc + chunk.length, 0), CACHE_SZ)
      var new_cache = new Uint8Array(new_cache_length)
      // Copy the old cache to the new cache
      new_cache.set(old_cache, 0)
      // Load the cache chunks into the new cache
      var current_offset = old_cache.length;
      for (let chunk of chunks) {
        if(current_offset < new_cache_length) {
          new_cache.set(chunk.subarray(0, new_cache_length - current_offset), current_offset);
          current_offset += chunk.length;
        }
      }
      return new_cache
    },

    async downloadToMem(fd, raw_dst_ptr, raw_length) {
      // Note: The length and dst_ptr are 53 bit integers in JS, so this _should_ be ok into a large memspace.
      var to_read = Number(raw_length)
      var dst_ptr = Number(raw_dst_ptr)

      var stream = 0;
      for(var i = 0; i < FS.streams.length; i++) {
        if(FS.streams[i].fd === fd) {
          stream = FS.streams[i]
        }
      }

      // Satisfy what we can with the cache first
      var bytes_read = this.readFromCache(stream, dst_ptr, to_read)
      stream.position += bytes_read
      stream.lastReadPosition = stream.position;
      dst_ptr += bytes_read
      to_read -= bytes_read

      // Return if we have satisfied the request
      if(to_read === 0) {
        //console.log("WEAVE_DRIVE: Satisfied request with cache. Returning...")
        return bytes_read
      }
      console.log("WEAVE_DRIVE: Read from cache: ", bytes_read, " Remaining to read: ", to_read)

      const chunk_download_sz = Math.max(to_read, CACHE_SZ)
      const to = Math.min(stream.node.total_size, stream.position + chunk_download_sz);
      console.log("WEAVE_DRIVE: fd: ", fd, " Read length: ", to_read, " Reading ahead:", to - to_read - stream.position)

      // Fetch with streaming
      const response = await fetch(`${mod.ARWEAVE}/${stream.node.name}`, { 
          method: "GET",
          redirect: "follow",
          headers: { "Range": `bytes=${stream.position}-${to}` } 
      });

      const reader = response.body.getReader()
      var bytes_until_cache = CHUNK_SZ
      var bytes_until_notify = NOTIFY_SZ
      var downloaded_bytes = 0
      var cache_chunks = []

      try {
        while (true) {
            const { done, value: chunk_bytes } = await reader.read();
            if (done) break;
            // Update the number of downloaded bytes to be _all_, not just the write length
            downloaded_bytes += chunk_bytes.length
            bytes_until_cache -= chunk_bytes.length
            bytes_until_notify -= chunk_bytes.length
    
            // Write bytes from the chunk and update the pointer if necessary
            const write_length = Math.min(chunk_bytes.length, to_read);
            if(write_length > 0) {
              //console.log("WEAVE_DRIVE: Writing: ", write_length, " bytes to: ", dst_ptr)
              mod.HEAP8.set(chunk_bytes.subarray(0, write_length), dst_ptr)
              dst_ptr += write_length
              bytes_read += write_length
              stream.position += write_length
              to_read -= write_length
            }

            if(to_read == 0) {
              // Add excess bytes to our cache
              const chunk_to_cache = chunk_bytes.subarray(write_length)
              //console.log("WEAVE_DRIVE: Cacheing excess: ", chunk_to_cache.length)
              cache_chunks.push(chunk_to_cache)
            }

            if(bytes_until_cache <= 0) {
              console.log("WEAVE_DRIVE: Chunk size reached. Compressing cache...")
              stream.node.cache = this.addChunksToCache(stream.node.cache, cache_chunks)
              cache_chunks = []
              bytes_until_cache = CHUNK_SZ
            }

            if(bytes_until_notify <= 0) {
              console.log("WEAVE_DRIVE: Downloaded: ", downloaded_bytes / stream.node.total_size * 100, "%")
              bytes_until_notify = NOTIFY_SZ
            }
        }
      } catch (error) {
          console.error("WEAVE_DRIVE: Error reading the stream: ", error)
      } finally {
          reader.releaseLock()
      }
      // If we have no cache, or we have not satisfied the full request, we need to download the rest
      // Rebuild the cache from the new cache chunks
      stream.node.cache = this.addChunksToCache(stream.node.cache, cache_chunks)

      // Update the last read position
      stream.lastReadPosition = stream.position
      return bytes_read
    },
    async createLinkFile(id) {
      var properties = { isDevice: false, contents: null };
      // TODO: might make sense to create the `data` folder here if does not exist
      var node = FS.createFile('/', 'data/' + id, properties, true, false);
      var bytesLength = await fetch(`${mod.ARWEAVE}/${id}`, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      node.total_size = Number(bytesLength)
      node.cache = new Uint8Array(0)
      node.position = 0;

      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, { usedBytes: { get: function () { return bytesLength; } } });
      node.stream_ops.mmap = (stream, length, position, prot, flags) => {
        console.log("ERR: MMAP WITHOUT DOWNLOAD. Name:", stream.node.name, " FD:", stream.node.fd)
        return { ptr: 0, allocated: true };
      };
      return Promise.resolve(node);
    }
  }
}