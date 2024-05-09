var deasyncPromise = require('deasync-promise')
var assert = require('assert')
const MB = (1024 * 1024)
const GB = 1000 * MB
const CHUNK_SZ = 100 * MB

module.exports = function weaveDrive(mod, FS) {
  var bytes = 0;
  const writer = (ptr) => new WritableStream({
    write(chunk) {
      mod.HEAP8.set(new Uint8Array(chunk), ptr)
      ptr += chunk.length;
      console.log("Chunk recv Bytes written: ", chunk.length, "New ptr:", ptr / (1024 * 1024));
    }
  }, new CountQueuingStrategy({ highWaterMark: 10000 }));
  const fetchRange = (url, from, to) => fetch(url, {
    headers: {
      Connection: 'keep-alive',
      Range: `bytes=${from}-${to}`
    }
  })

  return {
    async downloadFiles(url, filePath) {
      mod.files = mod.files ? mod.files : []
      var bytesLength = await fetch(url, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      // var offset = bytesLength > (4 * GB) ? Math.floor(bytesLength / 4) : bytesLength
      // var offset = Math.floor(bytesLength / 4)

      console.log("Allocating bytes for file", bytesLength)
      var ptr = mod._malloc(bytesLength)
      console.log("Got ptr for file at:", ptr)
      mod.files[filePath] = ptr
      const response = await fetch(url);
      console.log("Starting to pipe...")
      await response.body.pipeTo(writer(ptr))
      return Promise.resolve(bytesLength)
      /*
            if (offset === bytesLength) {
              
      
            } else {
              console.log('GET FILEs: please!');
      
              var offset = 0
              var chunk = 0
              var length = bytesLength
              while (length > 0) {
                console.log("Getting chunk ", chunk)
                console.log("Offset: ", offset)
                var chunkLength = Math.min(CHUNK_SZ, length)
                var arraybuf = await fetchRange(url, offset, chunkLength).then(response => response.arrayBuffer())
                var array = new Uint8Array(arraybuf)
                console.log("Getting pointer...")
                var ptr = mod._malloc(chunkLength)
                console.log("Got pointer:", ptr)
                mod.HEAP8.set(array, ptr)
                mod.files[filePath].push(ptr)
                offset += chunkLength
                length -= chunkLength
                chunk++
              }
            }
            console.log("Binaries for file: ", mod.files[filePath].length)
            */
    },
    createLinkFile(parent, name, bytes) {

      //console.log('lazyArray: ', lazyArray.cacheLength());
      var properties = { isDevice: false, contents: null };

      try {
        FS.stat(parent + name);
        return
      } catch (e) {
        console.log('Creating LinkFile')
      }

      var node = FS.createFile(parent, name, properties, true, false);
      node.link = true;

      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, {
        usedBytes: {
          get: function () { return bytes; }
        }
      });
      // override each stream op with one that tries to force load the lazy file first
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = (...args) => {
          //FS.forceLoadFile(node);
          return fn(...args);
        };
      });
      function readData(stream, heap, dst_ptr, length, file_ptr) {
        //console.log('Result from Promise: ', deasyncPromise(fetch('https://example.com').then(res => res.text())))
        //console.log("Reading from file", parent + name)
        //console.log({ src_ptr: mod.files[parent + name], dst_ptr: dst_ptr, read_len: length, position: file_ptr })
        //console.log('buffer size: ', mod.HEAP8.length)
        // console.log('file size: ', stream.node.usedBytes)
        // if (file_ptr >= stream.node.usedBytes) return 0;

        // Start of target zone:
        // HEAP8[offset] = FILE[position]
        // HEAP8[offset + length] = FILE[position + length]

        var bytes = mod.HEAP8.subarray(mod.files[parent + name] + file_ptr, mod.files[parent + name] + length + file_ptr)
        //console.log("Got bytes:", bytes)
        mod.HEAP8.set(bytes, dst_ptr)

        //console.log("Finished. Number of bytes read:", bytes.length)
        return bytes.length
        /*
                var curr_file_pos = 0
                var bytes_read = 0
                for (var chunk_num = 0; chunk_num < mod.files[parent + name].length; chunk_num++) {
                  console.log("Handling chunk...", {
                    file_ptr: file_ptr,
                    mem_ptr: mem_ptr,
                    current_pos: curr_file_pos,
                    chunk_len: length
                  })
                  if (file_ptr >= curr_file_pos && file_ptr <= curr_file_pos + length) {
                    console.log("alive")
                    //var chunk_stream = FS.open(parent + name + '.' + chunk.toString(), "r")
                    var chunk_ptr = mod.files[parent + name][chunk_num]
                    console.log("alive2")
                    var chunk_len = CHUNK_SZ
                    var chunk_read_offset = file_ptr - curr_file_pos
                    var chunk_read_len = Math.min(length, chunk_len - chunk_read_offset)
                    var chunk =
                      //chunk_stream.node.contents.subarray(
                      heap.subarray(
                        chunk_read_offset,
                        Math.min(chunk_read_len, length)
                      )
                    console.log("alive3")
                    //FS.close(chunk_stream)
        
                    console.log("Reading bytes as follows:")
                    console.log("Start of chunk offset in file", curr_file_pos)
                    console.log("Offset of chunk in file:", chunk_read_offset)
                    console.log("Write pointer:", mem_ptr)
                    console.log("File offset:", file_ptr)
                    console.log("Length:", chunk_read_len)
        
                    heap.set(chunk, mem_ptr)
        
                    console.log("Wrote data to RAM!")
        
                    mem_ptr += chunk_read_len
                    file_ptr += chunk_read_len
                    bytes_read += chunk_read_len
                    length -= chunk_read_len
                  }
        
                  curr_file_pos += chunk_len
                }
                // get file1 and append to buffer
                var s = FS.open(parent + name + '.1', "r");
                heap.set(s.node.contents, mem_ptr)
                FS.close(s);
        
                // get file2 and append to buffer
                var size1 = s.node.contents.length
                s = FS.open(parent + name + '.2', "r");
                heap.set(s.node.contents, mem_ptr + size1)
                FS.close(s);
        
                var size2 = s.node.contents.length
                // get file3 and append to buffer
                s = FS.open(parent + name + '.3', "r");
                heap.set(s.node.contents, mem_ptr + size1 + size2)
                FS.close(s);
                var size3 = s.node.contents.length
        
                // get file4 and append to buffer
                s = FS.open(parent + name + '.4', "r");
                heap.set(s.node.contents, mem_ptr + size1 + size2 + size3)
                FS.close(s);
                var size4 = s.node.contents.length;
                console.log('size: ', size1 + size2 + size3 + size4)
                // return 0 bytes to signal no need to call read chunk again.
                return size1 + size2 + size3 + size4;
        */
      }
      // use a custom read function
      stream_ops.read = (stream, buffer, offset, length, position) => {
        // FS.forceLoadFile(node);
        return readData(stream, buffer, offset, length, position)
      };
      // use a custom mmap function
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        console.log('LAZY_MMAP!');
        // FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        readData(stream, HEAP8, ptr, length, position);
        return { ptr, allocated: true };
      };
      node.stream_ops = stream_ops;
      return node;
    }
  }
}

function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

var lengthBytesUTF8 = (str) => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i); // possibly a lead surrogate
    if (c <= 0x7F) {
      len++;
    } else if (c <= 0x7FF) {
      len += 2;
    } else if (c >= 0xD800 && c <= 0xDFFF) {
      len += 4; ++i;
    } else {
      len += 3;
    }
  }
  return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0))
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 0xC0 | (u >> 6);
      heap[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 0xE0 | (u >> 12);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
      heap[outIdx++] = 0xF0 | (u >> 18);
      heap[outIdx++] = 0x80 | ((u >> 12) & 63);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
};