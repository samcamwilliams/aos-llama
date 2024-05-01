-- -------------------------------------------------------
-- LuaBase64.lua
-- Author: Eric Westbrook
-- -------------------------------------------------------
local _M = { __m=... }
-- -------------------------------------------------------
local C = require'cBase64'
-- -------------------------------------------------------
local b64encinit = C.b64encinit
local b64encupdate = C.b64encupdate
local b64encfinal = C.b64encfinal
-- -------------------------------------------------------
local b64decinit = C.b64decinit
local b64decupdate = C.b64decupdate
-- -------------------------------------------------------
function _M.encode(s)

  -- initialize state
  local b64e = b64encinit()

  -- process entire string in one update, then finalize
  local t = { b64encupdate(b64e, s), b64encfinal(b64e) }

  -- return results
  return table.concat(t) end
-- -------------------------------------------------------
function _M.decode(s)

  -- initialize state
  local b64d = b64decinit()

  -- process data
  local r = b64decupdate(b64d, s)

  -- return results
  return r end
-- -------------------------------------------------------
function _M.encfilter()

  -- closure state
  local b64e, eos

  -- manufacture and return the filter
  return function(s)

    -- we're reusable; initialize if needed
    if not b64e then b64e = b64encinit() end

    -- "catch up" signal? we're always caught up
    if '' == s then return '' end

    -- EOS (end of stream)?
    if nil == s then

      -- first EOS seen? finalize, return final chunk
      if not eos then
        eos = true
        local r = b64encfinal(b64e)
        return r end

      -- clear state, acknowledge EOS
      eos = nil
      b64e = nil
      return nil end

    -- process input chunk, return results chunk
    local r = b64encupdate(b64e, s)
    return r end end
-- -------------------------------------------------------
function _M.decfilter()

  -- closure state
  local b64d

  -- manufacture and return the filter
  return function(s)

    -- we're reusable; initialize if needed
    if not b64d then b64d = b64decinit() end

    -- "catch up"? we're always caught up
    if '' == s then return '' end

    -- EOS (end of stream)? clear state, acknowledge EOS
    if nil == s then
      b64d = nil
      return nil end

    -- process input chunk, return results chunk
    local r = b64decupdate(b64d, s)
    return r end end
-- -------------------------------------------------------
return _M
-- -------------------------------------------------------
