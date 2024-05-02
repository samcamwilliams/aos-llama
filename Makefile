# Set the location of your wallet for publication:
WALLET_LOC ?= key.json
# Set to 1 to enable debugging
DEBUG ?=

EMCC_CFLAGS=-O3 -msimd128 -fno-rtti -DNDEBUG \
	-flto=full -s BUILD_AS_WORKER=1 -s EXPORT_ALL=1 \
	-s EXPORT_ES6=1 -s MODULARIZE=1 -s INITIAL_MEMORY=800MB \
	-s MAXIMUM_MEMORY=4GB -s ALLOW_MEMORY_GROWTH -s FORCE_FILESYSTEM=1 \
	-s EXPORTED_FUNCTIONS=_main -s EXPORTED_RUNTIME_METHODS=callMain -s \
	NO_EXIT_RUNTIME=1 -Wunused-command-line-argument

.PHONY: build-test
build-test: build test

.PHONY: build
build: install AOS.wasm

.PHONY: test
test:
	cp AOS.wasm test/AOS.wasm
	npm install
ifeq ($(TEST),inference)
	./node_modules/.bin/mocha --grep="TEST_INFERENCE" test/load.test.js
else ifeq ($(TEST),load)
	./node_modules/.bin/mocha --grep="TEST_LOAD" test/load.test.js
else
	./node_modules/.bin/mocha test/load.test.js
endif

AOS.wasm: build/aos/process/AOS.wasm
	cp build/aos/process/AOS.wasm AOS.wasm

.PHONY: install build/aos/package.json
install: build/aos/package.json
	npm install

.PHONY: clean
clean:
	rm AOS.wasm test/AOS.wasm build/aos/process/AOS.wasm
	rm package-lock.json
	rm -rf node_modules
	docker rmi p3rmaw3b/ao || true

build/aos/package.json:
	cd build; \
		git submodule init; \
		git submodule update --remote

build/aos/process/AOS.wasm: build/llama.cpp/libllama.a build/aos/package.json container 
	docker run -v $(PWD)/build/aos/process:/src -v $(PWD)/build/llama.cpp:/llama.cpp p3rmaw3b/ao emcc-lua $(if $(DEBUG),-e DEBUG=TRUE)

build/llama.cpp:
	cd build; \
		git clone https://github.com/ggerganov/llama.cpp.git

build/llama.cpp/libllama.a: build/llama.cpp
	# docker run -v $(PWD)/build/llama.cpp:/llama.cpp p3rmaw3b/ao sh -c "cd /llama.cpp && export EMCC_CFLAGS='$(EMCC_CFLAGS)' && emcmake cmake"
	docker run -v $(PWD)/build/llama.cpp:/llama.cpp p3rmaw3b/ao sh -c "cd /llama.cpp && emmake make main EMCC_CFLAGS='$(EMCC_CFLAGS)'"

.PHONY: container
container:
	docker build . -f container/Dockerfile -t p3rmaw3b/ao

publish-module: AOS.wasm
	npm install
	WALLET=$(WALLET_LOC) scripts/publish-module