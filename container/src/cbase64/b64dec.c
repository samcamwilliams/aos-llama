// -------------------------------------------------------
// b64dec.c
// -------------------------------------------------------
#include "LuaBase64.h"
// -------------------------------------------------------
typedef struct b64dstate {
  unsigned char b[4];
  unsigned char n;
  unsigned char eq;
} b64dstate;
// -------------------------------------------------------
const static unsigned char b64d[] = {
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0, 62,  0,  0,  0, 63, 52, 53,
 54, 55, 56, 57, 58, 59, 60, 61,  0,  0,
  0,  0,  0,  0,  0,  0,  1,  2,  3,  4,
  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
 25,  0,  0,  0,  0,  0,  0, 26, 27, 28,
 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
 49, 50, 51,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0 };
// -------------------------------------------------------
#define C0(b0,b1) (((b64d[b0]) << 2) | ((b64d[b1]) >> 4))
#define C1(b1,b2) (((b64d[b1]) << 4) | ((b64d[b2]) >> 2))
#define C2(b2,b3) (((b64d[b2]) << 6) | (b64d[b3]))
// -------------------------------------------------------
int b64decinit_lua(Lua* L) {

  // allocate new state userdatum
  b64dstate* b64 = lua_newuserdata(L, sizeof(b64dstate));
  memset(b64, 0, sizeof(b64dstate));

  // mark userdata properly with our registered metatable
  luaL_getmetatable(L, UDATSTRUCTB64D);
  lua_setmetatable(L, -2);

  // return initialized userdatum struct
  return(1); }
// -------------------------------------------------------
int b64decupdate_lua(Lua* L) {

  // arg 1: state userdata
  b64dstate* b64 = luaL_checkudata(L, 1, UDATSTRUCTB64D);
  unsigned char* b = b64->b;

  // "feed me" if in "equals" state
  if (b64->eq) {
    lua_pushliteral(L, "");
    return(1); }

  // arg 2: input chunk
  size_t len;
  const unsigned char* str
    = (const unsigned char*)luaL_checklstring(L, 2, &len);

  // lua buffer for results chunk
  LBuf B; luaL_buffinit(L, &B);

  // iterate input, add results, update state
  size_t i = 0;
  unsigned char c = 0;
  unsigned char n = 0;
  while (i < len) {
    if (b64->eq) {
      break; }
    b[n = ((b64->n)++)] = (c = str[i++]);
    unsigned char eq = ('=' == c);
    if (eq || (3 == n)) {
      luaL_addchar(&B, C0(b[0],b[1]));
      if ((!eq) || (2<n)) {
        luaL_addchar(&B, C1(b[1],b[2])); }
      if (!eq) {
        luaL_addchar(&B, C2(b[2],b[3])); }
      memset(b64, 0, sizeof(b64dstate)); }
    b64->eq = eq; }

  // push and return results chunk
  luaL_pushresult(&B);
  return(1); }
// -------------------------------------------------------
