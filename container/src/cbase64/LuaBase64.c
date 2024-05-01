// -------------------------------------------------------
// LuaBase64.c
// -------------------------------------------------------
#include "LuaBase64.h"
// -------------------------------------------------------
static const luaL_Reg funcs[] =
  {
   {   "b64encinit"       , b64encinit_lua }
   , { "b64encupdate"     , b64encupdate_lua }
   , { "b64encfinal"      , b64encfinal_lua }
   , { "b64decinit"       , b64decinit_lua }
   , { "b64decupdate"     , b64decupdate_lua }
   , { 0, 0 }};
// -------------------------------------------------------
LUALIB_API int luaopen_LuaBase64_c(Lua* L) {

  // register userdata metatables
  luaL_newmetatable(L, UDATSTRUCTB64E);
  luaL_newmetatable(L, UDATSTRUCTB64D);

  // load functions
#if LUA_VERSION_NUM > 501
  lua_newtable(L);
  luaL_setfuncs(L, funcs, 0);
#else
  luaL_register(L, "LuaBase64.c", funcs);
#endif

  return(1); }
// -------------------------------------------------------
