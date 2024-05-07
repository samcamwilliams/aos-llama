local Llama = {}
Llama.backend = require("_llama")

function Llama.info()
    return "A decentralized LLM inference engine, built on top of llama.cpp."
end

function Llama.load(id)
    Llama.backend.load(id)
end

function Llama.setPrompt(prompt)
    Llama.backend.set_prompt(prompt)
end

function Llama.run(count)
    return Llama.backend.run(count)
end

function Llama.next()
    return Llama.backend.next()
end

-- Callback handling functions

Llama.logLevels = {
    [2] = "error",
    [3] = "warn",
    [4] = "info",
    [5] = "debug",
}

Llama.logLevel = 3
Llama.logToStderr = true

function Llama.onLog(level, str)
    if level <= Llama.logLevel then
        io.stderr:write(Llama.logLevels[level] .. ": " .. str)
        io.stderr:flush()
    end
end

function Llama.onProgress(str)
    io.stderr:write(".")
    io.stderr:flush()
end

_G.Llama = Llama

return Llama
