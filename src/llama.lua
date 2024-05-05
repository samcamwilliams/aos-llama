local llama = {}
llama.backend = require("_llama")

function llama.info()
    return "Decentralized llama.cpp."
end

function llama.loadModel(id, onModelLoaded)
    llama.backend.load(id)
end

function llama.setPrompt(prompt)
    -- Proxy the new prompt to the backend
    llama.backend.set_prompt(prompt)
end

function llama.run(count)
    return llama.backend.run(count)
end

return llama
