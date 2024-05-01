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
        function(msg) return msg.Id == llama.expects end,
        function(msg)
            if llama.modelSize == nil then
                -- This is the first model chunk, so we should set the model size
                llama.modelSize = tonumber(msg["Model-Size"])
            end

            if not msg.Next then
                -- This was the last part, so we should load it as the tokenizer and init the model
                local tokenizer = require('.base64').decode(msg.Data)
                llama.backend.load_tokenizer(tokenizer)
                msg.Data = nil
                tokenizer = nil
                collectgarbage("collect")
                llama.backend.init()
                -- Now that the model is ready, we should run the onModelLoaded callback, if set
                if llama.onModelLoaded then
                  llama.onModelLoaded()
                end
                -- Reset the loading state
                llama.expects = nil
            else
                -- This is a model chunk, so we should load it
                local chunk = require('.base64').decode(msg.Data)
                llama.backend.load_model(chunk, llama.modelSize)
                chunk = nil
                msg.Data = nil
                collectgarbage("collect")
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
