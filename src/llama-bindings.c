// llama lua wrappers

#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include "llama.h"

static int l_llama_init(lua_State *L) {
  int result = llama_init();
  lua_pushinteger(L, result);
  return 1;
}

// llama set prompt
static int l_llama_set_prompt(lua_State *L) {
  const char* prompt = luaL_checkstring(L, 1);
  llama_set_prompt((char*) prompt);
  return 0;
}

// llama get next token
static int l_llama_get_next_token(lua_State *L) {
  char* token = llama_get_next_token();
  lua_pushstring(L, token);

  return 1;
}

// register function
int luaopen_llama(lua_State *L) {
  static const luaL_Reg llama_funcs[] = {
      {"init", l_llama_init},
      {"set_prompt", l_llama_set_prompt},
      {"get_next_token", l_llama_get_next_token},
      {NULL, NULL}  // Sentinel to indicate end of array
  };

  luaL_newlib(L, llama_funcs); // Create a new table and push the library function
  return 1;
}