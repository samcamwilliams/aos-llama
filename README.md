# AOS-SQLITE

AOS-SQLite combines the ao operating system module and sqlite to create an ao custom module to add a lightweight but powerful indexer to your aos experience.

> The bulk of this effort was done by @elliotsayes during the Hack the Weave competition, Elliot was able to create this WASM Binary that includes both SQLite, LUA, and aos, as an `ao` Module.

AOS-SQLite Module - `ij7nvQ5XnAqqzEy-8vVz6GxSyb5HYZJ2SMtwDIUVMQY`

Run a SQLite Database with AOS

```sh
AOS_MODULE=ij7nvQ5XnAqqzEy-8vVz6GxSyb5HYZJ2SMtwDIUVMQY aos my-sqlite
```

## Spawn via a process

```lua
Spawn('ij7nvQ5XnAqqzEy-8vVz6GxSyb5HYZJ2SMtwDIUVMQY', {})
```

## Examples

```lua
local sqlite3 = require("lsqlite3")
 
db = sqlite3.open_memory()
  
db:exec[[
  CREATE TABLE test (id INTEGER PRIMARY KEY, content);
  INSERT INTO test VALUES (NULL, 'Hello Lua');
  INSERT INTO test VALUES (NULL, 'Hello Sqlite3');
  INSERT INTO test VALUES (NULL, 'Hello ao!!!');
]]
return "ok"

```

```lua
local s = ""
 
for row in db:nrows("SELECT * FROM test") do
  s = s .. row.id .. ": " .. row.content .. "\\n"
end
 
return s
```

## AO Resources

* https://ao.arweave.dev
* https://cookbook_ao.arweave.dev

---

This project builds the AOS-SQLITE WASM Binary and Publishes it to Arweave.

## Build Process

1. Build docker image

```sh
cd container
./build.sh
```

2. Get Latest aos module

```sh
git submodule init
git submodule update --remote
```

3. Use docker image to compile process.wasm

```sh
cd aos/process
docker run -v .:/src p3rmaw3b/ao emcc-lua
```

4. Publish Module with tags via arkb

> You will need a funded wallet for this step 

```sh
export WALLET=~/.wallet.json
npm run deploy
```
