#ifndef LLAMA_H
#define LLAMA_H

int luaopen_llama(lua_State *L);

int llama_load(char* model_path);
int llama_set_prompt(char* prompt);
char* llama_run(int len);
char* llama_next();
void llama_stop();

#endif // LLAMA_H

