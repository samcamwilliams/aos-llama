---@diagnostic disable: missing-parameter
local llama = {}
llama.backend = require("_llama")
llama.expects = nil
llama.modelSize = nil
llama.onModelLoaded = nil

function llama.info()
    return "This is an AOS module that implements wrappers around the functionality of llama.c"
end

function llama.loadModel(id, onModelLoaded)
    -- Set the loading metadata
    llama.expects = id
    llama.onModelLoaded = onModelLoaded

    -- Assign the first ID in the model to ourselves to start the loading process
    Assign({ Processes = {ao.id}, Message = id })

    -- Add a handler to process each of the model chunks that we receive
    Handlers.add(
        "_llama_loadModel",
        function(msg) return msg.id == llama.expects end,
        function(msg)
            if llama.modelSize == nil then
                -- This is the first model chunk, so we should set the model size
                llama.modelSize = tonumber(msg["Model-Size"])
            end

            if ~msg.Next then
                -- This was the last part, so we should load it as the tokenizer and init the model
                llama.backend.load_tokenizer(msg.data, #msg.data)
                llama.backend.init()
                -- Now that the model is ready, we should run the onModelLoaded callback, if set
                if llama.onModelLoaded then
                    llama.onModelLoaded()
                end
            else
                -- This is a model chunk, so we should load it
                llama.backend.load_model(msg.data, #msg.data, msg.modelSize)
                llama.expects = msg.Next
                Assign({ Processes = {ao.id}, Message = msg.Next })
            end
        end
    )

end

function llama.setPrompt(prompt)
    -- Proxy the new prompt to the backend
    llama.backend.set_prompt(prompt)
end

function llama.generate(count)
    local output = ""
    for i=1, count do
        output = output .. llama.backend.get_next_token()
    end
    return output
end

return llama