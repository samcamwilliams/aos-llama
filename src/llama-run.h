#ifndef LLAMA_RUN_H
#define LLAMA_RUN_H
#include <stdbool.h>
#include "llama.h"

int luaopen_llama(lua_State *L);

int llama_load(char* model_path);
int llama_set_prompt(char* prompt);
char* llama_run(int len);
char* llama_next();
int llama_add(char* new_string);
void llama_stop();

#endif // LLAMA_RUN_H

