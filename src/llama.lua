local llama = {}
llama.backend = require("_llama")

function llama.info()
    return "A decentralized LLM inference engine, built on top of llama.cpp."
end

function llama.load(id)
    llama.backend.load(id)
end

function llama.setPrompt(prompt)
    llama.backend.set_prompt(prompt)
end

function llama.run(count)
    return llama.backend.run(count)
end

function llama.next()
    return llama.backend.next()
end

return llama
