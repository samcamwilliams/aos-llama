#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <emscripten.h>

#if 1
#define AO_LOG(...) fprintf(stderr, __VA_ARGS__)
#else
#define AO_LOG(...)
#endif

// WeaveDrive file functions
EM_ASYNC_JS(int, arweave_fopen, (const char* c_filename, const char* mode), {
    try {
        const filename = UTF8ToString(Number(c_filename));
        
        const pathCategory = filename.split('/')[1];
        const id = filename.split('/')[2];
        console.log("JS: Opening file: ", filename);

        if (pathCategory === 'data') {
            if(FS.analyzePath(filename).exists) {
                for(var i = 0; i < FS.streams.length; i++) {
                    if(FS.streams[i].node.name === id) {
                        console.log("JS: Found file: ", filename, " fd: ", FS.streams[i].fd);
                        return Promise.resolve(FS.streams[i].fd);
                    }
                }
                console.log("JS: File not found: ", filename);
                return Promise.resolve(0);
            }
            else {
                if (Module.admissableList.includes(id)) {
                  const drive = Module.WeaveDrive(Module, FS);
                  const linkFile = await drive.createLinkFile(id);
                  const file = FS.open('/data/' + id, "r");
                  //drive.reset(file.fd);
                  console.log("JS: File opened: ", file.fd);
                  return Promise.resolve(file.fd);
                }
                else {
                    console.log("JS: Arweave ID is not admissable! ", id);
                    return Promise.resolve(0);
                }
            }
        }
        else if (pathCategory === 'headers') {
            console.log("Header access not implemented yet.");
            return Promise.resolve(0);
        }
        return Promise.resolve(0);
  } catch (err) {
    console.error('Error opening file:', err);
    return Promise.resolve(0);
  }
});

EM_ASYNC_JS(int, arweave_read, (int c_fd, int *dst_ptr, int length), {
    try {
        const drive = Module.WeaveDrive(Module, FS);
        const bytes_read = await drive.downloadToMem(c_fd, dst_ptr, length);
        return Promise.resolve(bytes_read);
  } catch (err) {
    console.error('Error reading file:', err);
    return Promise.resolve(0);
  }
});

FILE* fopen(const char* filename, const char* mode) {
    AO_LOG( "AO: Called fopen: %s, %s\n", filename, mode);
    FILE* res = (FILE*) 0;
    if (strncmp(filename, "/data", 5) == 0 || strncmp(filename, "/headers", 8) == 0) {
        AO_LOG("AO: arweave_fopen called\n");
        int fd = arweave_fopen(filename, mode);
        AO_LOG( "AO: arweave_fopen returned fd: %d\n", fd);
        if (fd) {
            res = fdopen(fd, mode);
        }
    }
    AO_LOG( "AO: fopen returned: %p\n", res);
    return res; 
}

size_t fread(void* ptr, size_t size, size_t nmemb, FILE* stream) {
    int fd = fileno(stream);
    //AO_LOG( "AO: fread called with: ptr %p, size: %zu, nmemb: %zu, FD: %d.\n", ptr, size, nmemb, fd);
    arweave_read(fd, ptr, size * nmemb);
    //AO_LOG( "AO: fread returned\n");
    return nmemb;
}

int fclose(FILE* stream) {
     AO_LOG( "AO: fclose called\n");
     return 0;  // Returning success, adjust as necessary
}

void* realloc(void* ptr, size_t size) {
    void* new_ptr = memalign(16, size);
    memcpy(new_ptr, ptr, size);
    free(ptr);
    //AO_LOG("DBG: Realloc called: %p -> %p, size: %zu\n", ptr, new_ptr, size);
    return new_ptr;
}

// Emscripten malloc does not align to 16 bytes correctly, which causes some 
// programs that use aligned memory (for example, those that use SIMD...) to
// crash. So we need to use the aligned allocator.
void* malloc(size_t size) {
    void* ret = memalign(16, size);

    if(size > 1024 * 1024) {
        //AO_LOG("AOMALLOC: called with size: %zu. Returned: %p\n", size, ret);
    }

    return ret;
}

int madvise(void* addr, size_t length, int advice) {
    AO_LOG("AO: madvise called with addr: %p, length: %zu, advice: %d\n", addr, length, advice);
    return 0;
}

/*
int munmap(void* addr, size_t length) {
    AO_LOG("AO: munmap called with addr: %p, length: %zu\n", addr, length);
    return 0;
}
*/