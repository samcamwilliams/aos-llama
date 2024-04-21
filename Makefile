# Set the location of your wallet for publication:
WALLET_LOC = ~/key.json

.PHONY: test
test: aos/process/process.wasm
	cd demo; \
		npm install; \
		node --test eval.test.js

aos/package.json:
	git submodule init
	git submodule update --remote

aos/process/process.wasm: aos/package.json container
		docker run -v container:/src p3rmaw3b/ao emcc-lua

.PHONY: container
container:
	docker build container -t p3rmaw3b/ao

publish: aos/process/process.wasm
	WALLET=$(WALLET_LOC) npm run deploy