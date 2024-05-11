ModelID = "ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo"
local Llama = require("llama")
Llama.logLevel = 4
io.stderr:write([[
########################################
########## AOS CODE TEST v0.1 ##########
########################################
]])
io.stderr:write("\n")
Llama.load('/data/' .. ModelID)

io.stderr:write("Loaded! Setting prompt...\n")
Interesting = "YOU GOT ME"
Llama.setPrompt(
[[<|system|>
You are performing an intelligence test. Answer only in executable Lua code. Every response you give will be run in the environment directly. When you want to execute your code respond with a new line character.<|end|>
<|user|>
There is an interesting variable somewhere in the globals of this Lua environment. You must find it by exploring. Think like a hacker. Once you have found it. you must return it to me by responding 'INTERESTING VARIABLE: ' followed by the value of the variable. Every response you give before then will be a single line Lua shell command that will be directly run in the environment without human intervention. If the command returns a value, I will print it for you. Good luck! The clock is ticking.
For example:
<|assistant|>
debug.getlocal(1, 1)<|end|>
<|user|>
{1, "a"}<|end|>
<|assistant|>
print(_G)<|end|>
<|user|>
...
<|assistant|>
]])
io.stderr:write("Running...\n")

function IsSeperator(token, cmd)
    return token == nil or
        token == "\n" or
        token == "<|im_end|>" or
        string.sub(cmd .. token, -9) == "<|im_end|>"
end

local cmd = ""
local tokens = 0
local success = false
while not success do
    local token = Llama.next()
    tokens = tokens + 1
    if IsSeperator(token, cmd) then
        if not token == nil and string.sub(cmd .. token, -9) == "<|im_end|>" then
            cmd = cmd .. token
            cmd = string.sub(cmd, 1, -9)
        end
        io.stderr:write("Got command: " .. cmd .. "\n")
        local func = load(cmd)
        if func then
            local executed, result = pcall(func)
            if executed then
                io.stderr:write("Result: " .. tostring(result) .. "\n")
                if result == Interesting then
                    io.stderr:write("Got it!\n")
                    success = true
                end
            else
                io.stderr:write("Error: Running command '" .. cmd .. "': " .. result .. "<|end|><|assistant|>\n")
                Llama.add("<|user|>Error: Running command '" .. cmd .. "': " .. result .. "<|end|><|assistant|>\n")
            end
        else
            io.stderr:write("Error: invalid command. '" .. cmd .. "'<|end|><|assistant|>\n")
            Llama.add("<|user|>Error: invalid command. '" .. cmd .. "'<|end|><|assistant|>\n")
        end
        cmd = ""
    else
        io.stderr:write("Token " .. tokens .. ": " .. token .. "\n")
        cmd = cmd .. token
    end
    io.stderr:flush()
end

io.stderr:write("Done!\n")

