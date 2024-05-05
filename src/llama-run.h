#ifndef LLAMA_H
#define LLAMA_H

int luaopen_llama(lua_State *L);

int llama_load(char* model_path);
void llama_set_prompt(char* prompt);
int llama_run(char* response, int n_len);

#endif // LLAMA_H

