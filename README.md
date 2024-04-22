# AOS-Llama

<img src="https://raw.githubusercontent.com/samcamwilliams/aos-llama2/main/image.webp" width="200">

_WIP: Here be dragons. The product of 3 nights of hacking -- use at your own risk!_

This repository builds an AOS image that contains the [llama2.c](https://github.com/karpathy/llama2.c) inference engine. It is a simple implementation of the core transformer architecture used by Meta's [Llama](https://llama.meta.com/) models, running fully onchain with AO.

When utilizing this version of AOS, you can use the `llama` Lua module to load a model from Arweave and generate text using it. You can then use that output in whatever way you would like in your AOS processes.

You can also use the tools in this repository to convert compatible models to the format that llama2.c expects, as well as publish them on to Arweave.

Special thanks to all of the following, whose work made this build possible:

- [@Karpathy](https://github.com/karpathy)
- [@Allquantor](https://github.com/allquantor)
- [@twilson63](https://github.com/twilson63)
- [@elliotsayes](https://github.com/elliotsayes)
- [@Meta](https://github.com/meta-ai)

...and the many others that made the infrastructure of the permaweb!

## Usage

AOS-Llama offers a simple interface for running LLM compute inside your AO processes. You will need to run a new AOS process using a module published from this repository in order to access it. You can start an AOS-Llama process as follows:

```bash
AOS_MODULE=AQhN6EY8jbwcd9YygzN1JvuaV_E86lHB-rjkQ7X3Omg aos your-llama-process-name
```

The above module ID is an example AOS-Llama that you can use without having to do any manual building yourself.

Once you have an AOS-Llama process live, you can load the library into your environment:

```Lua
Llama = require "llama"
```

We can now use our Llama engine to load a model into the process:

```Lua
Llama.loadModel(
  "_HJccCSYUDmk4cMAz7BRHZ3emAAa06WkKA_CqchYU7g",
  function()
    -- Do something once the model has loaded.
  end
)
```

The second parameter to `loadModel` is a callback function that will be executed once the model has been streamed into memory. The model in the ID referenced above is a `tinystories-15m` LLM.

Now that we have the model in our inference engine on AO, you can set its prompt and start generating text:

```Lua
Llama.setPrompt("One day, in a cyberspace far far away...")
print(Llama.generate(25))
```

The `Llama.generate` function allows you to specify the number of tokens you would like to generate. If you would then like to run a new prompt, simply `setPrompt` again and generation will start again.

Have fun!

## Build and Deployment Requirements

In order to build the AOS process module, your machine must have:

- Docker
- Node
- At least 8 GB of RAM

If you would like to publish a model to Arweave, you will need:

- Python 3
- An Arweave wallet topped up with credits for [Ardrive Turbo](https://ardrive.com/turbo)
- A model that can be converted to the appropriate format (see [here for details](https://github.com/karpathy/llama2.c#metas-llama-2-models))

## Publish an AOS-Llama model

AOS-Llama uses the `Onchain-Llama` data protocol to store models on Arweave. This format creates a chain of Arweave data items to allow the model uploads to be 'streamed' (via assigned messages) into AO processes. In order to publish a model, you will need to convert it to the appropriate format and then publish it to Arweave using this format.

### Converting your model

Use the `convert.py` script to convert your model to the appropriate format.

If your model is in Meta's 'original' Llama format, use the `--meta-llama` flag on `convert-model.py` to prepare it:

```bash
python3 scripts/convert-model.py <output-model-name> --meta-llama <path-to-model>
```

If your model is in Huggingface weight format (`hf`), use the following:

```bash
python3 scripts/convert-model.py <output-model-name> --hf <path-to-model>
```

### Preparing your tokenizer

Your model may also use a different vocabular/tokenizer file to the original Llama2. If so, please run the following script to convert it:

```bash
python scripts/tokenizer.py --tokenizer-model=<path-to-tokenizer.model>
```

These scripts were prepared by [@Karpathy](https://github.com/karpathy) for the original Llama2.c implementation. You can find the original implementation and details about their use [here](https://github.com/karpathy/llama2.c).

### Deploy to Arweave

You can use the `publish-model` script to deploy your model to Arweave. You will need to install the necessary node libraries first:

```bash
make install
```

Once installed, you can run the following to see the parameters of the deployment script:

```bash
scripts/publish-model

Usage: publish-model [options]
Options:
  -w [path]       Path to the Arweave wallet JSON file (default from ARWEAVE_WALLET env)
  -m [path]       Path to the model binary file (default: ./model.bin)
  -t [path]       Path to the tokenizer binary file (default: ./tokenizer.bin)
  -s [size]       Chunk size in megabytes (default: 100)
  -b [url]        Base URL for the bundler (default: https://turbo.ardrive.io)
  -h, --help      Display this help message and exit
```

An example invocation of the script may look as follows:

```bash
scripts/publish-model -w ~/key.json -t tokenizer.bin -m model.bin -s 10
```
Remember to have credits with the bundler before you upload! You can buy Ardrive Turbo credits via Stripe [here](https://app.ardrive.io/#/sign-in).

## Building the AOS image

To build and run the tests on the AOS image, simply run the following command in the root directory:

```bash
make 
```

This repo uses a docker environment to create a sandboxed environment for building AOS images -- downloading and installing the toolchain in a predictable environment, lowering the requirements on your host machine.

If you would like to build the AOS image without running the tests, you can run the following command:

```bash
make build
```

If you would like to print more debugging details to the console during compilation of any `make` target, you can use the `DEBUG=1` flag. For example:

```bash
make build DEBUG=1
```

## Publish the AOS image

When you would like to publish your AOS module to Arweave, you can use the following:

```
make publish-module WALLET=<path-to-wallet>
```
