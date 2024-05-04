#ifndef STREAM_H
#define STREAM_H

#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>

#include <stddef.h>

#define STREAM_MAX_SLOTS 255

extern unsigned char* raw_slots[STREAM_MAX_SLOTS];
extern size_t raw_slot_sizes[STREAM_MAX_SLOTS];

void stream_load(int slot, char* bytes, int size, int total_size);
size_t stream_get_size(int slot);
unsigned char* stream_get_slot(int slot);
int luaopen_stream(lua_State *L);

#endif // STREAM_H

