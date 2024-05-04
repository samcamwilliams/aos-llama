#include <stdio.h>
#include <stdlib.h>

#include <emscripten.h>


// ArweaveFS Entry
EM_ASYNC_JS(int, afs_fopen, (const char* filename, const char* mode), {
  // console.log('opening file: ', UTF8ToString(Number(filename)));
  // try {
  //   console.log('opening file: ', UTF8ToString(Number(filename)));
  //   const file = FS.open(UTF8ToString(Number(filename)), UTF8ToString(Number(mode)));
  //   return file.fd;
  //   // return 0;
  // } catch (err) {
  //   //console.error('Error opening file:', err);
  //   return 0;
  // }
  // console.log('opening file: ', UTF8ToString(Number(filename)));
  //return Promise.resolve(0);
  return 0;
});

EM_ASYNC_JS(size_t, afs_fread, (void* fd, size_t buffer, size_t size), {
  console.log('read file');
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
    afs_fopen(filename, mode);
    // return 0;  // Returning NULL to simulate failure, adjust as necessary for your testing
    return 0; 
}

// int fclose(FILE* stream) {
//     fprintf(stderr, "Called fclose\n");
//     return 0;  // Returning success, adjust as necessary
// }

size_t fread(void* ptr, size_t size, size_t nmemb, FILE* stream) {
  printf("read file\n");
  afs_fread(ptr, size, nmemb);
  return 0;
}

int fseek(FILE* stream, long offset, int whence) {
    fprintf(stderr, "Called fseek with offset: %ld, whence: %d\n", offset, whence);
    return 0;  // Returning success, adjust as necessary
}

long ftell(FILE* stream) {
    fprintf(stderr, "Called ftell\n");
    return 0;  // Returning 0 as the current position, adjust as necessary
}