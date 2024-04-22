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
  int total_size = luaL_checkinteger(L, 3);
  const char* bytes = luaL_checklstring(L, 1, &size);
  int model_size = luaL_checkinteger(L, 2);
  llama_load_model((char*) bytes, model_size, total_size);
  return 0;
}

// llama load tokenizer. This can be called once.
static int l_llama_load_tokenizer(lua_State *L) {
  size_t size;
  const char* bytes = luaL_checklstring(L, 1, &size);
  llama_load_tokenizer((char*) bytes, (int) size);
  return 0;
}

int luaopen_llama(lua_State *L) {
    static const luaL_Reg llama_funcs[] = {
        {"init", l_llama_init},
        {"set_prompt", l_llama_set_prompt},
        {"get_next_token", l_llama_get_next_token},
        {"load_model", l_llama_load_model},
        {"load_tokenizer", l_llama_load_tokenizer},
        {NULL, NULL}  // Sentinel to indicate end of array
    };

    // Create a new library table for C functions
    luaL_newlib(L, llama_funcs);

    // Load the Lua part of the library
    luaL_dostring(L, "require 'llama'");  // Load and run the Lua file
    if (lua_istable(L, -1)) {
        // Assume the top of the stack now contains the Lua module table
        lua_pushnil(L);  // Start of next iteration
        while (lua_next(L, -2)) {
            // -2 is the index of the Lua module table
            // -1 is the index of the value, -2 is now the index of the key
            lua_pushvalue(L, -2);  // Copy of the key for lua_setfield
            // stack now: key, value, key
            lua_insert(L, -2);  
            // stack now: key, key, value
            lua_setfield(L, -5, lua_tostring(L, -1));  // Set it in the C functions table
            // stack after setfield: key
        }
        // Pop the Lua module table
        lua_pop(L, 1);
    } else {
        lua_pop(L, 1);  // Pop the non-table result of luaL_dofile
        luaL_error(L, "Expected table from llama.lua, got something else");
    }

    return 1;  // Return the library table
}