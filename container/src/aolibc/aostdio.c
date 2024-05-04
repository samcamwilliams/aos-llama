#include <stdio.h>
#include <stdlib.h>

FILE* fopen(const char* filename, const char* mode) {
    fprintf(stderr, "Called fopen with filename: %s, mode: %s\n", filename, mode);
    return 0;  // Returning NULL to simulate failure, adjust as necessary for your testing
}

int fclose(FILE* stream) {
    fprintf(stderr, "Called fclose\n");
    return 0;  // Returning success, adjust as necessary
}

size_t fread(void* ptr, size_t size, size_t nmemb, FILE* stream) {
    fprintf(stderr, "Called fread with size: %zu, nmemb: %zu\n", size, nmemb);
    return 0;  // Returning 0 to simulate no data read, adjust as necessary
}

int fseek(FILE* stream, long offset, int whence) {
    fprintf(stderr, "Called fseek with offset: %ld, whence: %d\n", offset, whence);
    return 0;  // Returning success, adjust as necessary
}

long ftell(FILE* stream) {
    fprintf(stderr, "Called ftell\n");
    return 0;  // Returning 0 as the current position, adjust as necessary
}