# Set the location of your wallet for publication:
WALLET_LOC ?= key.json

.PHONY: test
test: demo/process.wasm
	cd demo; \
		npm install; \
		node --test eval.test.js

.PHONY: build
build: aos/process/process.wasm

.PHONY: install
install: aos/package.json
	npm install

aos/package.json:
	git submodule init
	git submodule update --remote

demo/process.wasm: aos/process/process.wasm
	cp aos/process/process.wasm demo/process.wasm

aos/process/process.wasm: aos/package.json container
	cd aos/process; \
		docker run -v .:/src p3rmaw3b/ao emcc-lua

.PHONY: container
container:
	docker build container -t p3rmaw3b/ao

publish-module: aos/process/process.wasm
	npm install
	WALLET=$(WALLET_LOC) ./publish-module