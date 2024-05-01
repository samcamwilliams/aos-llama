// -------------------------------------------------------
// luab64.h
// -------------------------------------------------------
#ifndef _LUAB64_H
#define _LUAB64_H
// -------------------------------------------------------
#define LUA_LIB
// -------------------------------------------------------
#define _GNU_SOURCE
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include <string.h>
// -------------------------------------------------------
#define UDATSTRUCTB64E   "w.structb64e"
#define UDATSTRUCTB64D   "w.structb64d"
// -------------------------------------------------------
typedef lua_State   Lua;
typedef luaL_Buffer LBuf;
// -------------------------------------------------------
int b64encinit_lua(Lua*);
int b64encupdate_lua(Lua*);
int b64encfinal_lua(Lua*);
// -------------------------------------------------------
int b64decinit_lua(Lua*);
int b64decupdate_lua(Lua*);
// -------------------------------------------------------
#endif // _LUAB64_H
// -------------------------------------------------------
