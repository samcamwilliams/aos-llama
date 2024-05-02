// stream lua wrappers

#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include "stream.h"

static int l_stream_load(lua_State *L) {
  size_t size;
  int buffer = luaL_checkinteger(L, 1);
  const char* bytes = luaL_checklstring(L, 2, &size);
  int total_size = luaL_checkinteger(L, 3);
  stream_load(buffer, (char*) bytes, size, total_size);
  return 0;
}

static int l_stream_get_size(lua_State *L) {
  int buffer = luaL_checkinteger(L, 1);
  size_t buffer_size = stream_get_size(buffer);
  lua_pushinteger(L, buffer_size);
  return 1;
}

// register function
int luaopen_stream(lua_State *L) {
static const luaL_Reg stream_funcs[] = {
      {"load", l_stream_load},
      {"get_size", l_stream_get_size},
      {NULL, NULL}  // Sentinel to indicate end of array
  };

  luaL_newlib(L, stream_funcs); // Create a new table and push the library function
  return 1;
}