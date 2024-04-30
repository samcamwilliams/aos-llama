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

// llama load model. This can be called repeatedly.
static int l_llama_load_model(lua_State *L) {
  size_t size;
  const char* bytes = luaL_checklstring(L, 1, &size);
  int total_size = luaL_checkinteger(L, 2);
  llama_load_model((char*) bytes, size, total_size);
  return 0;
}

static int l_llama_get_model_size(lua_State *L) {
  size_t model_size = llama_get_model_size();
  lua_pushinteger(L, model_size);
  return 1;
}

// llama load tokenizer. This can be called once.
static int l_llama_load_tokenizer(lua_State *L) {
  size_t size;
  const char* bytes = luaL_checklstring(L, 1, &size);
  llama_load_tokenizer((char*) bytes, (int) size);
  return 0;
}

// register function
int luaopen_llama(lua_State *L) {
  static const luaL_Reg llama_funcs[] = {
      {"init", l_llama_init},
      {"set_prompt", l_llama_set_prompt},
      {"get_next_token", l_llama_get_next_token},
      {"load_model", l_llama_load_model},
      {"load_tokenizer", l_llama_load_tokenizer},
      {"get_model_size", l_llama_get_model_size},
      {NULL, NULL}  // Sentinel to indicate end of array
  };

  luaL_newlib(L, llama_funcs); // Create a new table and push the library function
  return 1;
}