/**
 * Embedding Worker - 在 Web Worker 中运行 embedding 模型
 * 避免阻塞主线程 UI
 */

import { pipeline, env } from '@huggingface/transformers';

let embedder = null;
let modelName = 'Xenova/multilingual-e5-small';

env.allowLocalModels = false;
env.useBrowserCache = true;

self.onmessage = async (event) => {
    const { type, id, payload } = event.data;

    try {
        switch (type) {
            case 'init':
                await initModel(payload.modelName);
                self.postMessage({ type: 'init', id, status: 'ready' });
                break;

            case 'embedQuery':
                const queryVector = await embedQuery(payload.text);
                self.postMessage({ type: 'embedQuery', id, result: queryVector });
                break;

            case 'embedDocument':
                const docVector = await embedDocument(payload.text);
                self.postMessage({ type: 'embedDocument', id, result: docVector });
                break;

            case 'embedDocuments':
                const vectors = await embedDocuments(payload.texts, payload.onProgress);
                self.postMessage({ type: 'embedDocuments', id, result: vectors });
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({ type: 'error', id, error: error.message });
    }
};

async function initModel(name) {
    if (embedder) return;
    modelName = name || modelName;
    embedder = await pipeline('feature-extraction', modelName, {
        dtype: 'q8',
    });
}

async function embedQuery(text) {
    const result = await embedder(text, {
        pooling: 'mean',
        normalize: true
    });
    return Array.from(new Float32Array(result.data));
}

async function embedDocument(text) {
    const result = await embedder(text, {
        pooling: 'mean',
        normalize: true
    });
    return Array.from(new Float32Array(result.data));
}

async function embedDocuments(texts, onProgress) {
    const vectors = [];
    for (let i = 0; i < texts.length; i++) {
        vectors.push(await embedDocument(texts[i]));
        if (onProgress) {
            self.postMessage({ 
                type: 'progress', 
                current: i + 1, 
                total: texts.length 
            });
        }
    }
    return vectors;
}
