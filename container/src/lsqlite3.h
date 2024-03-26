#ifndef LSQLITE3_H
#define LSQLITE3_H

#include "lua.h"

#define LUA_SQLLIBNAME  "lsqlite3"
LUAMOD_API int (luaopen_lsqlite3)(lua_State *L);

#endif
