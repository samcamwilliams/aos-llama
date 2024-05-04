#include "stream.h"
#include <stdlib.h>
#include <string.h>

unsigned char* raw_slots[STREAM_MAX_SLOTS] = {0};
size_t raw_slot_sizes[STREAM_MAX_SLOTS] = {0};

void stream_load(int slot, char* bytes, int size, int total_size) {
    if (slot < 0 || slot >= STREAM_MAX_SLOTS) {
        return; // Invalid slot index
    }
    if (raw_slots[slot] == 0) {
        raw_slots[slot] = (unsigned char*)malloc(total_size);
        if (raw_slots[slot] == NULL) {
            return; // Failed to allocate memory
        }
    }
    memcpy(raw_slots[slot] + raw_slot_sizes[slot], bytes, size);
    raw_slot_sizes[slot] += size;
}

size_t stream_get_size(int slot) {
    if (slot < 0 || slot >= STREAM_MAX_SLOTS) {
        return 0; // Invalid slot index
    }
    return raw_slot_sizes[slot];
}

unsigned char* stream_get_slot(int slot) {
    if (slot < 0 || slot >= STREAM_MAX_SLOTS) {
        return 0; // Invalid slot index
    }

    return raw_slots[slot];
}