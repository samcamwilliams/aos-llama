// llama lua wrappers

#include <stdlib.h>
#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include "llama-run.h"

static int l_llama_load(lua_State *L) {
  const char* model_path = luaL_checkstring(L, 1);
  int result = llama_load((char*) model_path);
  lua_pushinteger(L, result);
  return 1;
}

// llama set prompt
static int l_llama_set_prompt(lua_State *L) {
  const char* prompt = luaL_checkstring(L, 1);
  llama_set_prompt((char*) prompt);
  return 0;
}

// Get a series of tokens as a string
static int l_llama_run(lua_State *L) {
  int tokens = luaL_checkinteger(L, 1);
  char* result = llama_run(tokens);
  lua_pushstring(L, result);
  free(result);
  return 1;
}

// Get the next token
static int l_llama_next(lua_State *L) {
  char* result = llama_next();
  lua_pushstring(L, result);
  free(result);
  return 1;
}

// register function
int luaopen_llama(lua_State *L) {
  static const luaL_Reg llama_funcs[] = {
      {"load", l_llama_load},
      {"set_prompt", l_llama_set_prompt},
      {"run", l_llama_run},
      {"next", l_llama_next},
      {NULL, NULL}  // Sentinel to indicate end of array
  };

  luaL_newlib(L, llama_funcs); // Create a new table and push the library function
  return 1;
}