#ifndef LLAMA_H
#define LLAMA_H
int llama_init(void);
void llama_set_prompt(char* prompt);
char* llama_get_next_token(void);

void llama_load_model(char* bytes, int size, int total_size);
size_t llama_get_model_size();

void llama_load_tokenizer(char* bytes, int size);

int luaopen_llama(lua_State *L);
#endif // LLAMA_H