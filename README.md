# AOS-Llama

<img src="https://raw.githubusercontent.com/samcamwilliams/aos-llama2/main/image.webp" width="400">


## 1. aos-llama Features**

![image](https://github.com/freecodewu/aos-llama-Architecture-specification/assets/96016540/6cf46a30-02e7-4d7c-a2a6-864cbe706675)



The main features of aos-llama are as follows:

1. **Builds an AOS Image**:
    - aos-llama uses the llama2.c inference engine to build an AOS image, enabling full on-chain execution in AO processes.
2. **Provides a Lua Interface**:
    - It provides a Lua interface to load Llama models from Arweave and generate text.
3. **Includes Conversion Tools**:
    - aos-llama includes tools to convert models to the llama2.c format and publish them on Arweave.
4. **Offers Comprehensive Toolset**:
    - It offers tools for building AOS images, converting models, and publishing to Arweave.

These features allow aos-llama to efficiently execute AI inference on AO.

## 2. Technical Architecture Diagram

![image](https://github.com/freecodewu/aos-llama-Architecture-specification/assets/96016540/8eaa9e01-5ed0-434c-bcc4-d79bcb2a868e)

The technical architecture of aos-llama can be divided into the following main parts:

1. **Llama AO Process**:
    - In the AO environment, the Llama AO Process is responsible for running the Llama models.
2. **AOS.wasm**:
    - This is a WebAssembly module that is published to Arweave. It is built using the emcc-lua tool.
3. **Build Docker**:
    - The build process takes place in a Docker container, using emcc-lua to generate AOS.wasm.
    - The container includes the necessary source code and build scripts, such as llama-run.cpp, llama.lua, emcc_lua_lib, and main.lua.
4. **Model Conversion and Publishing**:
    - Specific tools are used to convert models to the appropriate format and publish them to Arweave.
    - After conversion, the model files are stored on Arweave, ready to be loaded by the AO Process.
5. **Arweave**:
    - Arweave acts as a decentralized storage platform, storing AOS.wasm and model files.
    - The AO loads AOS.wasm and model files from Arweave to perform AI inference tasks.

### Detailed Process:

**Pre-build:**

- In the Docker build container, the pre-build steps include compiling `llama-run.cpp` to generate `llama-run.o` and obtaining `libllama.a` from the GitHub repository.

**Build AOS.wasm:**

- Using the `emcc-lua` tool, the pre-built `llama-run.o` and `libllama.a` are combined to generate the final `AOS.wasm` file.

**Publish to Arweave:**

- The generated `AOS.wasm` and model files are published to Arweave for use by the AO.

**Load and Execute:**

- The AO loads the `AOS.wasm` and model files from Arweave and executes the AI inference tasks. This enables on-chain AI model invocation and verifiable AI inference results.
Watch this space...
