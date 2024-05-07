//var XMLHttpRequest = require("node-xmlhttprequest").XMLHttpRequest;
var assert = require('assert')
const MB = (1024 * 1024)
const GB = 1000 * MB

module.exports = function weaveDrive(FS) {
  var bytes = 0;
  const writer = (filePath) => new WritableStream({
    write(chunk) {
      bytes += chunk.length;
      FS.writeFile(filePath, new Uint8Array(chunk), { flags: 'a' });
      console.log("File:" + filePath + " JS: Bytes written: ", bytes);
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
      var bytesLength = await fetch(url, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      console.log('bytes: ', bytesLength)
      var offset = bytesLength > (4 * GB) ? Math.floor(bytesLength / 4) : bytesLength
      console.log('offset: ', offset)
      if (offset === bytesLength) {
        const response = await fetch(url);
        await response.body.pipeTo(writer(filePath));
      } else {
        console.log('GET FILEs: please!');
        await fetchRange(url, 0, offset).then(response => response.body.pipeTo(writer(filePath + '.1')));
        await fetchRange(url, offset, offset * 2).then(response => response.body.pipeTo(writer(filePath + '.2')));
        await fetchRange(url, offset * 2 + 1, offset * 3).then(response => response.body.pipeTo(writer(filePath + '.3')));
        await fetchRange(url, offset * 3 + 1, bytesLength - 1).then(response => response.body.pipeTo(writer(filePath + '.4')));

        // await Promise.all([
        //   () => fetchRange(url, 0, offset).then(response => response.body.pipeTo(writer(filePath + '.1'))),
        //   //() => fetchRange(url, offset, offset * 2).then(response => response.body.pipeTo(writer(filePath + '.2'))),
        //   //() => fetchRange(url, offset * 2 + 1, offset * 3).then(response => response.body.pipeTo(writer(filePath + '.3'))),
        //   //() => fetchRange(url, offset * 3 + 1, offset * 4).then(response => response.body.pipeTo(writer(filePath + '.4')))
        // ])
      }
      return Promise.resolve("OK")
    },
    createLazyFile(parent, name, url, canRead, canWrite) {
      // Lazy chunked Uint8Array (implements get and length from Uint8Array).
      // Actual getting is abstracted away for eventual reuse.
      class LazyUint8Array {
        constructor() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        get(idx) {
          if (idx > this.length - 1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize) | 0;
          return this.getter(chunkNum)[chunkOffset];
        }
        setDataGetter(getter) {
          this.getter = getter;
        }
        cacheLength() {
          console.log("URL:", url);
          // Find length
          var headers = awaitSync(() => fetch(url, {
            method: 'HEAD'
          }).then(res => res.headers).catch(e => ({ e })))
          console.log("Headers: ", headers);
          // if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(headers.get('Content-Length'));

          var header;
          var hasByteServing = (header = headers.get("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = headers.get("Content-Encoding")) && header === "gzip";

          var chunkSize = 1024 * 1024; // Chunk size in bytes

          if (!hasByteServing) chunkSize = datalength;

          // Function to get a range from the remote URL.
          var doXHR = (from, to) => {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
            return new Uint8Array(deasyncPromise(fetch(url, {
              headers: {
                Range: `bytes=${from}-${to}`
              }
            }).then(res => res.arrayBuffer())))

            // var xhr = new XMLHttpRequest();
            // xhr.open('GET', url, false);
            // if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);

            // // Some hints to the browser that we want binary data.
            // xhr.responseType = 'arraybuffer';
            // if (xhr.overrideMimeType) {
            //   xhr.overrideMimeType('text/plain; charset=x-user-defined');
            // }

            // xhr.send(null);

            // if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            // if (xhr.response !== undefined) {
            //   return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
            // }
            // return intArrayFromString(xhr.responseText || '', true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength - 1); // if datalength-1 is selected, this is the last block
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
            return lazyArray.chunks[chunkNum];
          });

          if (usesGzip || !datalength) {
            // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
            chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }

          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        get length() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._length;
        }
        get chunkSize() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._chunkSize;
        }
      }

      console.log('CREATE FILE: ', url);
      var lazyArray = new LazyUint8Array();
      //console.log('lazyArray: ', lazyArray.cacheLength());
      var properties = { isDevice: false, contents: lazyArray };
      console.log('Properties: ', properties);
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      // This is a total hack, but I want to get this lazy file code out of the
      // core of MEMFS. If we want to keep this lazy file concept I feel it should
      // be its own thin LAZYFS proxying calls to MEMFS.
      if (properties.contents) {
        node.contents = properties.contents;
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, {
        usedBytes: {
          get: function () { return this.contents.length; }
        }
      });
      // override each stream op with one that tries to force load the lazy file first
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = (...args) => {
          FS.forceLoadFile(node);
          return fn(...args);
        };
      });
      function writeChunks(stream, buffer, offset, length, position) {
        console.log('WRITE_CHUNKS: ', { offset, length, position })
        var contents = stream.node.contents;
        if (position >= contents.length)
          return 0;
        var size = Math.min(contents.length - position, length);
        assert(size >= 0);
        if (contents.slice) { // normal array
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents[position + i];
          }
        } else {
          for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
            buffer[offset + i] = contents.get(position + i);
          }
        }
        return size;
      }
      // use a custom read function
      stream_ops.read = (stream, buffer, offset, length, position) => {
        console.log('LAZY_READ!');
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position)
      };
      // use a custom mmap function
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        console.log('LAZY_MMAP!');
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        writeChunks(stream, HEAP8, ptr, length, position);
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