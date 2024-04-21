FROM emscripten/emsdk:3.1.14
LABEL maintainer "tom wilson <tom@hyper.io>"

# The working directory used by the base image is /src, so we can mount volumes to there
# to expose files on the host to the ao container
# 
# https://github.com/emscripten-core/emsdk/blob/9b0db91883452051aca8deddc932363aab29060b/docker/Dockerfile#L120

RUN apt-get update -qq && \
    apt-get install -y curl vim make gcc libreadline6-dev libssl-dev zlib1g-dev zip unzip && \
    rm -rf /var/lib/apt/lists/*

# Consolidate environment variables, including those for WASM compilation
ENV LUA_VERSION=5.3.4 \
    LUAROCKS_VERSION=2.4.4 \
    PYTHON_VERSION=3.6.6 \
    NODE_VERSION=18.17.0 \
    NVM_DIR=/root/.nvm \
    DENO_INSTALL="/root/.deno" \
    PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:$DENO_INSTALL/bin:${PATH}" \
    CC='emcc -s WASM=1' \
    NM='llvm-nm'


# Consolidate installations to reduce layers, and clean up in the same layer to use less space
RUN pip3 install pyyaml && \
    curl -L http://www.lua.org/ftp/lua-${LUA_VERSION}.tar.gz | tar xzf - -C / && \
    cd /lua-${LUA_VERSION} && \
    make linux test && \
    make install && \
    cd / && \
    curl -L https://luarocks.org/releases/luarocks-${LUAROCKS_VERSION}.tar.gz | tar xzf - -C / && \
    cd /luarocks-${LUAROCKS_VERSION} && \
    ./configure && \
    make build && \
    make install && \
    cd / && rm -rf /luarocks-${LUAROCKS_VERSION} && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} && \
    nvm use v${NODE_VERSION} && nvm alias default v${NODE_VERSION} && \
    node --version && npm --version


# Re-compile lua with "generic WASM" 
RUN cd /lua-${LUA_VERSION} && \
    make clean && \
    make generic CC='emcc -s WASM=1 -U LUA_32BITS' 

#############################
##### Install Commands ######
#############################

# NOTE: Some commands do not require additional work
# when building the image, but are still commented
# here for posterity

###############
#### Init #####
###############
# The init command currently does not require running
# within the ao container, and so requires no additional setup

###############
#### Repl #####
###############
# The repl command simply fires up lua repl, which is installed
# as part of lua runtime above, and so requires no additional setup

###############
#### Build ####
###############
# Specific files copied as per original requirement

RUN mkdir -p /opt/src

COPY ./src/emcc-lua /usr/local/bin/emcc-lua
COPY ./src/emcc_lua_lib /usr/local/emcc-lua/emcc_lua_lib

COPY ["./src/pre.js", \
      "./src/definition.yml", \
      "./src/loader.lua", \
      "/opt/"]

COPY ["./src/json.lua", \
      "./src/ao.lua", \
      "./src/main.c", \
      "./src/lsqlite3.c", \
      "./src/lsqlite3.h", \
      "./src/sqlite3.c", \
      "./src/sqlite3.h", \
      "./src/main.lua", \
      "./src/llama.c", \
      "./src/tokenizer.bin", \
      "./src/model.bin", \
      "./src/generate-model-object.py", \
      "./src/Makefile", \
      "/opt/src/"]

COPY ./src/node /opt/node


## Build Llama2-emscripten
###########################################
### Publish, Bundler, Process, Contract ###
###########################################
# We first create a directory for the node impls to be placed
# and dependencies installed
# 
# By running npm link, we allow any commands exposed by
# the node module to be ran globally within the container

RUN chmod +x /usr/local/bin/emcc-lua && \
    cd /opt/src && make emscripten && \
    cd /opt/node && npm install --omit="dev" && npm link

ENV CC 'emcc -s WASM=1'
ENV NM 'llvm-nm'

