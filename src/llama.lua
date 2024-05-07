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

function Llama.add(str)
    Llama.backend.add(str)
end

function Llama.stop()
    Llama.backend.stop()
end

-- Callback handling functions

Llama.logLevels = {
    [2] = "error",
    [3] = "warn",
    [4] = "info",
    [5] = "debug",
}

Llama.logLevel = 5
Llama.logToStderr = true
Llama.log = {}

function Llama.onLog(level, str)
    if level <= Llama.logLevel then
        if Llama.logToStderr then
            io.stderr:write(Llama.logLevels[level] .. ": " .. str)
            io.stderr:flush()
        end
        if not Llama.log[Llama.logLevels[level]] then
            Llama.log[Llama.logLevels[level]] = {}
        end
        table.insert(Llama.log[Llama.logLevels[level]], str)
    end
end

function Llama.onProgress(str)
    io.stderr:write(".")
    io.stderr:flush()
end

_G.Llama = Llama

return Llama
