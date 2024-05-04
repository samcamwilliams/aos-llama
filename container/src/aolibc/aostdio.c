#include <stdio.h>
#include <stdlib.h>

#include <emscripten.h>


// ArweaveFS Entry
EM_ASYNC_JS(FILE*, afs_fopen, (const char* filename, const char* mode), {
  try {
    const file = FS.open(UTF8ToString(Number(filename)), UTF8ToString(Number(mode)));
    return file.fd;
  } catch (err) {
    console.error('Error opening file:', err);
    return -1;
  }
});

EM_ASYNC_JS(size_t, afs_fread, (void* fd, size_t buffer, size_t size), {
  try {
    console.log('PATH: ', FS.streams[fd].path);
    const data = FS.read(FS.streams[fd], HEAPU8, buffer, size, 0);
    return data;
  } catch (err) {
    console.error('Error reading file: ', err);
    return -1;
  }
});

FILE* fopen(const char* filename, const char* mode) {
    return afs_fopen(filename, mode);
    // return 0;  // Returning NULL to simulate failure, adjust as necessary for your testing
 
}

int fclose(FILE* stream) {
    fprintf(stderr, "Called fclose\n");
    return 0;  // Returning success, adjust as necessary
}

size_t fread(void* ptr, size_t size, size_t nmemb, FILE* stream) {
  return afs_fread(ptr, size, nmemb);
}

int fseek(FILE* stream, long offset, int whence) {
    fprintf(stderr, "Called fseek with offset: %ld, whence: %d\n", offset, whence);
    return 0;  // Returning success, adjust as necessary
}

long ftell(FILE* stream) {
    fprintf(stderr, "Called ftell\n");
    return 0;  // Returning 0 as the current position, adjust as necessary
}