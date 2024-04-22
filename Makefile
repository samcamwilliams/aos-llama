# Set the location of your wallet for publication:
WALLET_LOC = ~/key.json

.PHONY: test
test: demo/process.wasm
	cd demo; \
		npm install; \
		node --test eval.test.js

aos/package.json:
	git submodule init
	git submodule update --remote

demo/process.wasm: container/src/process.wasm
	cp container/src/process.wasm demo/process.wasm
	cp container/src/process.js demo/process.js

container/src/process.wasm: aos/package.json container
	cd container/src; \
		set -e; \
		docker run -v .:/src p3rmaw3b/ao emcc-lua

.PHONY: container
container:
	docker build container -t p3rmaw3b/ao

publish: aos/process/process.wasm
	WALLET=$(WALLET_LOC) npm run deploy