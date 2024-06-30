#include "common.h"
#include "llama.h"

#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

#define CTX_SIZE 2048

gpt_params params;
llama_model* model;

llama_context * ctx;
int tks_processed = 0;

bool save_state = false;
uint8_t * save_state_ctx_data;
int save_state_tks_processed = 0;

extern "C" bool l_llama_on_progress(float progress, void * user_data);
extern "C" void l_llama_on_log(enum ggml_log_level level, const char * text, void * user_data);

extern "C" int llama_load(char* model_path);
int llama_load(char* model_path) {
    params.model = model_path;

    // init LLM
    llama_backend_init();

    // initialize the model
    llama_model_params model_params = llama_model_default_params();
    model_params.use_mmap = true;
    model = llama_load_model_from_file(params.model.c_str(), model_params);

    if (model == NULL) {
        fprintf(stderr , "%s: error: unable to load model\n" , __func__);
        return 1;
    }

    return 0;
}

int isCtxFull() {
    return tks_processed > llama_n_ctx(ctx);
}

void llama_reset_context() {
    llama_free(ctx);
    tks_processed = 0;

    // (Re-)initialize the context
    llama_context_params ctx_params = llama_context_default_params();

    ctx_params.seed  = 1234;
    ctx_params.n_ctx = CTX_SIZE;
    ctx_params.n_threads = params.n_threads;
    ctx_params.n_threads_batch = params.n_threads_batch == -1 ? params.n_threads : params.n_threads_batch;

    ctx = llama_new_context_with_model(model, ctx_params);

    if (ctx == NULL) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "error: failed to create the llama_context\n", NULL);
    }
}

extern "C" int llama_add(char* new_string);
int llama_add(char* new_string) {
    std::vector<llama_token> new_tokens_list = ::llama_tokenize(ctx, new_string, true);

    if (isCtxFull()) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "Context full, cannot add more tokens\n", NULL);
        return 1;
    }

    fprintf(stderr, "Adding to prompt...\n");

    auto batch = llama_batch_get_one(new_tokens_list.data(), new_tokens_list.size(), tks_processed, 0);
    if (llama_decode(ctx, batch) != 0) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "Failed to eval, return code %d\n", NULL);
        return 1;
    }

    tks_processed += new_tokens_list.size();
    return 0;
}

extern "C" int llama_set_prompt(char* prompt);
int llama_set_prompt(char* prompt) {
    params.prompt = prompt;
    llama_reset_context();
    // Not needed ?
    // params.prompt = prompt;

    return llama_add(prompt);
}

extern "C" char* llama_next();
char* llama_next() {
    auto   n_vocab = llama_n_vocab(model);
    auto * logits  = llama_get_logits(ctx);
    char * token = (char*)malloc(256);

    std::vector<llama_token_data> candidates;
    candidates.reserve(n_vocab);

    for (llama_token token_id = 0; token_id < n_vocab; token_id++) {
        candidates.emplace_back(llama_token_data{ token_id, logits[token_id], 0.0f });
    }

    llama_token_data_array candidates_p = { candidates.data(), candidates.size(), false };

    // sample the most likely token
    llama_token new_token_id = llama_sample_token_greedy(ctx, &candidates_p);
    std::string token_str = llama_token_to_piece(ctx, new_token_id);
    strcpy(token, token_str.c_str());

    // is it an end of generation?
    if (llama_token_is_eog(model, new_token_id)) {
        return 0;
    }

    auto batch = llama_batch_get_one(&new_token_id, 1, tks_processed, 0);
    if (llama_decode(ctx, batch) != 0) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "Failed to eval, return code %d\n", NULL);
        return 0;
    }

    tks_processed += 1;
    return token;
}

extern "C" char* llama_run(int len);
char* llama_run(int len) {
    char* response = (char*)malloc(len * 256);

    response[0] = '\0';

    for (int i = 0; i < len; i++) {
        // sample the next token
        char* next_token = llama_next();
        strcat(response, next_token);
        free(next_token);
    }

    return response;
}

extern "C" void llama_save_state();
void llama_save_state() {
    // Free the previous save state, if it exists
    if (save_state) {
        free(save_state_ctx_data);
    }

    // Allocate & copy memory from active context
    size_t active_context_size = llama_state_get_size(ctx);
    save_state_ctx_data = (uint8_t *)malloc(active_context_size * sizeof(uint8_t));
    llama_state_get_data(ctx, save_state_ctx_data);

    // Set misc variables
    save_state_tks_processed = tks_processed;

    fprintf(stderr, "Saved state of size %zu at position %d\n", active_context_size, save_state_tks_processed);

    save_state = true;
}

// Returns whether the state was loaded
extern "C" bool llama_load_state();
bool llama_load_state() {
    if (!save_state) {
        return false;
    }

    llama_reset_context();
    
    llama_state_set_data(ctx, save_state_ctx_data);
    tks_processed = save_state_tks_processed;

    fprintf(stderr, "Loaded state of size %zu at position %d\n", llama_state_get_size(ctx), tks_processed);

    return true;
}

// Returns whether the state was cleared
extern "C" bool llama_clear_state();
bool llama_clear_state() {
    if (save_state) {
        free(save_state_ctx_data);
        save_state_tks_processed = 0;
        save_state = false;
        return true;
    }
    return false;
}

extern "C" void llama_stop();
void llama_stop() {
    llama_free(ctx);
    llama_free_model(model);
    llama_backend_free();
}