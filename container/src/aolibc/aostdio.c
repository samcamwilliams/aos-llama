#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <emscripten.h>

#ifdef DEBUG
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
                console.log("JS: File exists: ", filename);
                const file = FS.open("/data/" + id, "r");
                console.log("JS: File opened: ", file.fd);
                return Promise.resolve(file.fd);
            }
            else {
                if (Module.admissableList.includes(id)) {
                  Module.files = Module.files ? Module.files : {};
                  const drive = Module.WeaveDrive(Module, FS);
                  console.log("Calling downloadFiles");
                  const bytes = await drive.downloadFiles('https://arweave.net/' + id, '/data/' + id);
                  console.log("Calling createLinkFile");
                  const linkFile = await drive.createLinkFile('/','data/' + id, bytes);
                   // createLazyFile if split. 
                   const file = FS.open('/data/' + id, "r");
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

// NOTE: Currently unused, but this is the start of how we would do it.
EM_ASYNC_JS(size_t, arweave_read, (void *buffer, size_t size, size_t nmemb, int fd), {
    try {
        console.log('JS: Reading requested data... ', buffer, size, nmemb, fd);
        console.log("Sending args:", HEAP8, Number(buffer), Number(size) * Number(nmemb), 0);
        const bytes_read = FS.streams[fd].stream_ops.read(FS.streams[fd], HEAP8, Number(buffer), Number(Number(size) * Number(nmemb)), 0);
        console.log('JS: Read data: ', bytes_read);
        await new Promise((r) => setTimeout(r, 1000));
        console.log('Resolving...');
        return Promise.resolve(bytes_read);
    } catch (err) {
        console.error('JS: Error reading file: ', err);
        return Promise.resolve(-1);
    }
});

// NOTE: This may not actually be necessary. But if it is, here is how we would
// emulate the 'native' emscripten fopen.
FILE *fallback_fopen(const char *filename, const char *mode) {
    int fd;
    int flags;

    // Basic mode to flags translation
    if (strcmp(mode, "r") == 0) {
        flags = O_RDONLY;
    } else if (strcmp(mode, "w") == 0) {
        flags = O_WRONLY | O_CREAT | O_TRUNC;
    } else if (strcmp(mode, "a") == 0) {
        flags = O_WRONLY | O_CREAT | O_APPEND;
    }

    // Open file and convert to FILE*
    fd = open(filename, flags, 0666); // Using default permissions directly
    if (fd == -1) { // If fd is -1, return NULL as if the fopen failed
        return NULL;
    }
    return fdopen(fd, mode);
}

FILE* fopen(const char* filename, const char* mode) {
    AO_LOG( "AO: Called fopen: %s, %s\n", filename, mode);
    FILE* res = (FILE*) 0;
    if (strncmp(filename, "/data", 5) == 0 || strncmp(filename, "/headers", 8) == 0) {
        int fd = arweave_fopen(filename, mode);
        AO_LOG( "AO: arweave_fopen returned fd: %d\n", fd);
        if (fd) {
            res = fdopen(fd, mode);
        }
    }
    AO_LOG( "AO: fopen returned: %p\n", res);
    return res; 
}

int fclose(FILE* stream) {
     AO_LOG( "Called fclose\n");
     return 0;  // Returning success, adjust as necessary
}

void* realloc(void* ptr, size_t size) {
    void* new_ptr = memalign(16, size);
    memcpy(new_ptr, ptr, size);
    free(ptr);
    AO_LOG("DBG: Realloc called: %p -> %p, size: %zu\n", ptr, new_ptr, size);
    return new_ptr;
}

// Emscripten malloc does not align to 16 bytes correctly, which causes some 
// programs that use aligned memory (for example, those that use SIMD...) to
// crash. So we need to use the aligned allocator.
void* malloc(size_t size) {
    void* ret = memalign(16, size);

    if(size > 1024 * 1024) {
        AO_LOG("AOMALLOC: called with size: %zu. Returned: %p\n", size, ret);
    }

    return ret;
}
/*
size_t fread(void* ptr, size_t size, size_t nmemb, FILE* stream) {
    int fd = fileno(stream);
    AO_LOG( "AO: fread called with: ptr %p, size: %zu, nmemb: %zu, FD: %d.\n", ptr, size, nmemb, fd);
    size_t bytes_read = arweave_read(ptr, size, nmemb, (unsigned int) fd);
    AO_LOG( "I'M BACK\n");
    fflush(stderr);
    //AO_LOG( "AO: fread returned: %zu. Output: %s\n", bytes_read, ptr);
    return bytes_read;
}

int fseek(FILE* stream, long offset, int whence) {
    AO_LOG( "Called fseek with offset: %ld, whence: %d\n", offset, whence);
    return 0;  // Returning success, adjust as necessary
}

long ftell(FILE* stream) {
    AO_LOG( "Called ftell\n");
    return 0;  // Returning 0 as the current position, adjust as necessary
}
*/