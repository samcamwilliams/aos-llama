#include "common.h"
#include "llama.h"

#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

#define CTX_SIZE 2048

gpt_params params;
llama_model* model;
llama_batch batch;
llama_context * ctx;
int tks_processed = 0;

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
    tks_processed = 0;
    llama_batch_free(batch);
    llama_free(ctx);

    batch = llama_batch_init(512, 0, 1);

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

extern "C" int llama_set_prompt(char* prompt);
int llama_set_prompt(char* prompt) {
    llama_reset_context();
    params.prompt = prompt;

    // tokenize the prompt
    std::vector<llama_token> tokens_list;
    tokens_list = ::llama_tokenize(ctx, params.prompt, true);

    // make sure the KV cache is big enough to hold all the prompt and generated tokens
    if (isCtxFull()) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "error: n_kv_req > n_ctx, the required KV cache size is not big enough\n", NULL);
        return 1;
    }

    // create a llama_batch with size 512
    // we use this object to submit token data for decoding
    batch = llama_batch_init(512, 0, 1);

    fprintf(stderr, "Starting to ingest prompt...\n");

    // evaluate the initial prompt
    for (size_t i = 0; i < tokens_list.size(); i++) {
        llama_batch_add(batch, tokens_list[i], i, { 0 }, false);
        tks_processed += 1;
    }

    // llama_decode will output logits only for the last token of the prompt
    batch.logits[batch.n_tokens - 1] = true;

    if (llama_decode(ctx, batch) != 0) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "Failed to eval, return code %d\n", NULL);
        return 1;
    }

    return 0;
}

extern "C" char* llama_next();
char* llama_next() {
    auto   n_vocab = llama_n_vocab(model);
    auto * logits  = llama_get_logits_ith(ctx, batch.n_tokens - 1);
    char* token = (char*)malloc(256);

    std::vector<llama_token_data> candidates;
    candidates.reserve(n_vocab);

    for (llama_token token_id = 0; token_id < n_vocab; token_id++) {
        candidates.emplace_back(llama_token_data{ token_id, logits[token_id], 0.0f });
    }

    llama_token_data_array candidates_p = { candidates.data(), candidates.size(), false };

    // sample the most likely token
    const llama_token new_token_id = llama_sample_token_greedy(ctx, &candidates_p);
    std::string token_str = llama_token_to_piece(ctx, new_token_id);
    strcpy(token, token_str.c_str());
    tks_processed += 1;

    // is it an end of generation?
    if (llama_token_is_eog(model, new_token_id)) {
        return 0;
    }

    // prepare the next batch
    llama_batch_clear(batch);

    // push this new token for next evaluation
    llama_batch_add(batch, new_token_id, tks_processed, { 0 }, true);

    // evaluate the current batch with the transformer model
    if (llama_decode(ctx, batch)) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "Failed to eval, return code %d\n", NULL);
        return 0;
    }

    return token;
}

extern "C" char* llama_run(int len);
char* llama_run(int len) {
    char* response = (char*)malloc(len * 256);

    for (int i = 0; i < len; i++) {
        // sample the next token
        char* next_token = llama_next();
        strcat(response, next_token);
        free(next_token);
    }

    return response;
}

extern "C" int llama_add(char* new_string);
int llama_add(char* new_string) {
    std::vector<llama_token> new_tokens_list = ::llama_tokenize(ctx, new_string, true);

    if (isCtxFull()) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "Context full, cannot add more tokens\n", NULL);
        return 1;
    }

    // Add new tokens to the batch
    for (size_t i = 0; i < new_tokens_list.size(); i++) {
        llama_batch_add(batch, new_tokens_list[i], tks_processed + i, {0}, false);
        tks_processed++;
    }

    batch.logits[batch.n_tokens - 1] = true;
    if (llama_decode(ctx, batch) != 0) {
        l_llama_on_log(GGML_LOG_LEVEL_ERROR, "llama_decode() failed with new tokens\n", NULL);
        return 1;
    }

    return 0;
}

extern "C" void llama_stop();
void llama_stop() {
    llama_free(ctx);
    llama_batch_free(batch);
    llama_free_model(model);
    llama_backend_free();
}