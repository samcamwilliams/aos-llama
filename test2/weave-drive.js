var assert = require('assert')
const KB = 1024
const MB = KB * 1024
const GB = MB * 1024
const CACHE_SZ = 16 * MB

module.exports = function weaveDrive(mod, FS) {
  return {
    reset(fd) {
      console.log("WEAVE_DRIVE: Resetting fd: ", fd)
      FS.streams[fd].node.position = 0
      FS.streams[fd].node.cache = new Uint8Array(0)
    },
    async downloadToMem(fd, raw_dst_ptr, raw_length) {
      // Note: The length and dst_ptr are 53 bit integers in JS, so this _should_ be ok into a large memspace.
      var bytes_read = 0
      var length = Number(raw_length)
      var dst_ptr = Number(raw_dst_ptr)

      var stream = 0;
      for(var i = 0; i < FS.streams.length; i++) {
        if(FS.streams[i].fd === fd) {
          stream = FS.streams[i]
        }
      }
      var file_offset = stream.position
      //console.log("WEAVE_DRIVE: Downloading to mem: ", fd, dst_ptr, length, file_offset)

      if(stream.lastReadPosition !== file_offset) {
        console.log("WEAVE_DRIVE: Position has been changed between reads. Resetting the cache...")
        console.log("Last set to: ", stream.lastReadPosition)
        console.log("Currently at: ", file_offset)
        console.log("Length to read: ", length)
        stream.node.cache = new Uint8Array(0)
      }

      // Take bytes from the cache first, if we already have them
      var cache_part_length = Math.min(length, stream.node.cache.length)
      var cache_part = stream.node.cache.subarray(0, cache_part_length)
      mod.HEAP8.set(cache_part, Number(dst_ptr))
      // Set the new cache to the rest of the cache and update pointers
      stream.node.cache = stream.node.cache.subarray(cache_part_length)
      bytes_read += cache_part_length
      dst_ptr += cache_part_length
      file_offset += cache_part_length
      length -= cache_part_length

      // Return if we have satisfied the request
      if(length === 0) {
        //console.log("WEAVE_DRIVE: Satisfied request with cache. Returning...")
        return length
      }

      // If we have no cache, or we have not satisfied the full request, we need to download the rest
      const url = `${mod.ARWEAVE}/${stream.node.name}`
      const from = file_offset
      const chunk_download_sz = Math.max(length, CACHE_SZ)
      const to = Math.min(stream.node.total_size, file_offset + chunk_download_sz);
      //console.log("WEAVE_DRIVE: fd: ", fd, " From: ", from, " To: ", to, " Read length: ", length, " Readahead cache length:", to - length - file_offset)
      console.log("WEAVE_DRIVE: fd: ", fd, " Read length: ", length, " Readahead cache length:", to - length - file_offset)
      var res = await fetch(url, { method: "GET", redirect: "follow", headers: { Range: `bytes=${from}-${to}` } })

      const dataChunk = new Uint8Array(await res.arrayBuffer())
      // Write the data to the destination pointer
      const write_chunk = dataChunk.subarray(0, length)
      mod.HEAP8.set(write_chunk, Number(dst_ptr))
      bytes_read += length
      // Cache the remainder of the data
      stream.node.cache = dataChunk.subarray(length)
      // Set the position and the tracker for it, such that the cache can be invalidated if it is externally moved.
      stream.position = file_offset + length
      stream.lastReadPosition = stream.position
      console.log("Set new stream position: ", stream.position)

      console.log("WEAVE_DRIVE: Got " + bytes_read + " bytes. Cache length: " + stream.node.cache.length)
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
      /*node.stream_ops.llseek = (stream, offset, whence) => {
        console.log("WEAVE_DRIVE: called llseek: ", offset, whence, " Current ptr: ", stream.node.ptr)
        console.log("Stream.position: ", stream.position)
        switch(whence) {
          case 0: // SEEK_SET
            stream.node.ptr = offset
            break;
          case 1: // SEEK_CUR
            stream.node.ptr += offset
            break;
          case 2: // SEEK_END
            stream.node.ptr = stream.node.total_size - offset
            break;
        }
        console.log("WEAVE_DRIVE: llseek new ptr: ", stream.node.ptr)
        node.cache = new Uint8Array(0)
        return 0;
      }*/
      return Promise.resolve(node);
    }
  }
}