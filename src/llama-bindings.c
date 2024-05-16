// llama lua wrappers

#include <stdlib.h>
#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <string.h>
#include "llama-run.h"
#include "llama.h"

extern lua_State *wasm_lua_state;

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

// llama add string to running session
static int l_llama_add(lua_State *L) {
  const char* prompt = luaL_checkstring(L, 1);
  llama_add((char*) prompt);
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

static int l_llama_stop(lua_State *L) {
  llama_stop();
  return 0;
}

static int l_llama_apply_template(lua_State *L) {
  llama_chat_message* msgs;
  int count = 0;

  // Make sure the table is at the given index
  if (!lua_istable(L, -1)) {
      return 0;
  }

  // Get the size of the table
  lua_pushnil(L);  // First key
  while (lua_next(L, -1) != 0) {
      count++;
      lua_pop(L, 1);  // Remove the value, keep the key for next iteration
  }

  // Allocate memory for the llama_chat_message array
  llama_chat_message* messages = (llama_chat_message*) malloc(count * sizeof(llama_chat_message));
  if (!messages) {
      return 0;
  }

  // Populate the array with key-value pairs from the Lua table
  int i = 0;
  lua_pushnil(L);  // First key
  while (lua_next(L, -1) != 0) {
      if (lua_type(L, -2) == LUA_TSTRING && lua_type(L, -1) == LUA_TSTRING) {
          const char *role = lua_tostring(L, -2);
          const char *content = lua_tostring(L, -1);

          // Allocate memory for the strings and copy them
          messages[i].role = strdup(role);
          messages[i].content = strdup(content);

          i++;
      }
      lua_pop(L, 1);  // Remove the value, keep the key for next iteration
  }

  fprintf(stderr, "C got lua table with %d elements, as follows:\n", count);

  for(int i = 0; i < count; i++) {
    fprintf(stderr, "%s: %s\n", messages[i].role, messages[i].content);
  }

  return 1;
}

// register function
int luaopen_llama(lua_State *L) {
  static const luaL_Reg llama_funcs[] = {
	  {"load", l_llama_load},
      {"set_prompt", l_llama_set_prompt},
      {"add", l_llama_add},
      {"run", l_llama_run},
      {"next", l_llama_next},
      {"apply_template", l_llama_apply_template},
      {"stop", l_llama_stop},
      {NULL, NULL}  // Sentinel to indicate end of array
  };

  luaL_newlib(L, llama_funcs); // Create a new table and push the library function
  return 1;
}

// Handle callbacks in Lua
void l_llama_on_log(enum ggml_log_level level, const char * str, void* userdata) {
  lua_State *L = wasm_lua_state;

  lua_getglobal(L, "Llama");
  lua_getfield(L, -1, "onLog");
  lua_remove(L, -2); // Remove the llama table from the stack

  lua_pushinteger(L, level);
  lua_pushstring(L, str);
  lua_call(L, 2, 0);

  fflush(stderr);
}

bool l_llama_on_progress(float progress, void * user_data) {
  lua_State *L = wasm_lua_state;

  lua_getglobal(L, "Llama");
  lua_getfield(L, -1, "onProgress");
  lua_remove(L, -2); // Remove the llama table from the stack

  lua_pushnumber(L, progress);
  lua_call(L, 1, 0);
  return true;
}