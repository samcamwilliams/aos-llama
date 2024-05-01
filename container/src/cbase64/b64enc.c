// -------------------------------------------------------
// b64enc.c
// -------------------------------------------------------
#include "LuaBase64.h"
// -------------------------------------------------------
typedef struct b64estate {
  unsigned char b[3];
  unsigned char n;
} b64estate;
// -------------------------------------------------------
const static char* b64e =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  "abcdefghijklmnopqrstuvwxyz"
  "0123456789+/";
// -------------------------------------------------------
int b64encinit_lua(Lua* L) {

  // allocate new state userdatum
  b64estate* b64 = lua_newuserdata(L, sizeof(b64estate));
  memset(b64, 0, sizeof(b64estate));

  // mark userdata properly with our registered metatable
  luaL_getmetatable(L, UDATSTRUCTB64E);
  lua_setmetatable(L, -2);

  // return initialized userdatum struct
  return(1); }
// -------------------------------------------------------
#define C0(b0) ((b0) >> 2)
#define C1(b0,b1) (((0x03 & (b0)) << 4) + ((b1) >> 4))
#define C2(b1,b2) (((0x0f & (b1)) << 2) + ((b2) >> 6))
#define C3(b2) (0x3f & (b2))
// -------------------------------------------------------
int b64encupdate_lua(Lua* L) {

  // arg 1: struct b64e userdata
  b64estate* b64 = luaL_checkudata(L, 1, UDATSTRUCTB64E);
  unsigned char* b = b64->b;

  // arg 2: input chunk
  size_t len;
  const unsigned char* str
    = (const unsigned char*)luaL_checklstring(L, 2, &len);

  // lua buffer for result chunk
  LBuf B; luaL_buffinit(L, &B);

  // iterate input, add results
  size_t i = 0;
  while (i < len) {
    b[(b64->n)++] = str[i++];
    if (3 == b64->n) {
      luaL_addchar(&B, b64e[C0(b[0])]);
      luaL_addchar(&B, b64e[C1(b[0],b[1])]);
      luaL_addchar(&B, b64e[C2(b[1],b[2])]);
      luaL_addchar(&B, b64e[C3(b[2])]);
      b64->n = 0; }}

  // push and return result chunk
  luaL_pushresult(&B);
  return(1); }
// -------------------------------------------------------
int b64encfinal_lua(Lua* L) {

  // arg 1: struct b64e userdata
  b64estate* b64 = luaL_checkudata(L, 1, UDATSTRUCTB64E);

  // arg 2: input chunk
  const unsigned char* b = b64->b;

  // lua buffer for result chunk
  LBuf B; luaL_buffinit(L, &B);

  // iterate input, add results
  unsigned char n = b64->n;
  if (2 == n) {
      luaL_addchar(&B, b64e[C0(b[0])]);
      luaL_addchar(&B, b64e[C1(b[0],b[1])]);
      luaL_addchar(&B, b64e[C2(b[1],0)]);
      luaL_addchar(&B, '=');
  } else if (1 == n) {
      luaL_addchar(&B, b64e[C0(b[0])]);
      luaL_addchar(&B, b64e[C1(b[0],0)]);
      luaL_addchar(&B, '=');
      luaL_addchar(&B, '='); }
  
  // push and return result chunk
  luaL_pushresult(&B);
  return(1); }
// -------------------------------------------------------
