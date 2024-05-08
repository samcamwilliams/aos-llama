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
      // var offset = bytesLength > (4 * GB) ? Math.floor(bytesLength / 4) : bytesLength
      var offset = Math.floor(bytesLength / 4)
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

      }
      return Promise.resolve(bytesLength)
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
          FS.forceLoadFile(node);
          return fn(...args);
        };
      });
      function writeChunks(stream, buffer, offset, length, position) {
        console.log({ offset, length, position })
        if (position >= stream.node.usedBytes) return 0;
        // get file1 and append to buffer
        var s = FS.open(parent + name + '.1', "r");
        buffer.set(s.node.contents, offset)
        FS.close(s);

        // get file2 and append to buffer
        var size1 = s.node.contents.length
        s = FS.open(parent + name + '.2', "r");
        buffer.set(s.node.contents, offset + size1)
        FS.close(s);

        var size2 = s.node.contents.length
        // get file3 and append to buffer
        s = FS.open(parent + name + '.3', "r");
        buffer.set(s.node.contents, offset + size1 + size2)
        FS.close(s);
        var size3 = s.node.contents.length

        // get file4 and append to buffer
        s = FS.open(parent + name + '.4', "r");
        buffer.set(s.node.contents, offset + size1 + size2 + size3)
        FS.close(s);
        var size4 = s.node.contents.length;
        console.log('size: ', size1 + size2 + size3 + size4)
        // return 0 bytes to signal no need to call read chunk again.
        return size1 + size2 + size3 + size4;
      }
      // use a custom read function
      stream_ops.read = (stream, buffer, offset, length, position) => {
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