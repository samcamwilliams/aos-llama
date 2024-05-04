# Set the location of your wallet for publication:
WALLET_LOC ?= key.json
# Set to 1 to enable debugging
DEBUG ?=

.PHONY: build-test
build-test: build test

.PHONY: build
build: install AOS.wasm

.PHONY: test2
test2: 
	cp build/aos/process/AOS.wasm test2/AOS.wasm
	cp build/aos/process/AOS.js test2/AOS.js
	cd test2 && yarn test

.PHONY: test
test:
	cp AOS.wasm test/AOS.wasm
	cd test && npm install
ifeq ($(TEST),inference)
	npm run test:INFERENCE
else ifeq ($(TEST),load)
	npm run test:LOAD
else
	cd test && npm test 
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

build/aos/process/AOS.wasm: build/aos/package.json container
	docker run -v $(PWD)/build/aos/process:/src p3rmaw3b/ao emcc-lua $(if $(DEBUG),-e DEBUG=TRUE)

.PHONY: container
container:
	docker build . -f container/Dockerfile -t p3rmaw3b/ao

publish-module: AOS.wasm
	npm install
	WALLET=$(WALLET_LOC) scripts/publish-module