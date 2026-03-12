/**
 * Local-First AI Calendar - 核心模块
 * 
 * 使用 EdgeVecIndex 高级 API + Web Worker Embedding
 * 
 * 特性：
 * - EdgeVecIndex 简洁 API
 * - Web Worker 运行 embedding 模型 (不阻塞 UI)
 * - 支持 multilingual-e5-small 多语言 embedding
 */

import init from 'edgevec';
import EdgeVecIndex from 'edgevec/edgevec-wrapper.js';

let initialized = false;

async function ensureInit() {
    if (!initialized) {
        await init();
        initialized = true;
    }
}

class LocalAIStore {
    constructor(options = {}) {
        this.dimensions = options.dimensions || 384;
        this.modelName = options.modelName || 'Xenova/multilingual-e5-small';
        this.store = null;
        this.worker = null;
        this.isReady = false;
        this.pendingCallbacks = new Map();
        this.callbackId = 0;
    }

    async initialize(onProgress) {
        await ensureInit();
        await this._initWorker(onProgress);
        await this._initStore();
        this.isReady = true;
    }

    async _initWorker(onProgress) {
        return new Promise((resolve, reject) => {
            this.worker = new Worker(
                new URL('./embedding-worker.js', import.meta.url),
                { type: 'module' }
            );

            const callbackId = this._registerCallback((message) => {
                if (message.type === 'init' && message.status === 'ready') {
                    resolve();
                } else if (message.type === 'error') {
                    reject(new Error(message.error));
                } else if (message.type === 'progress' && onProgress) {
                    onProgress(message.current, message.total);
                }
            });

            this.worker.postMessage({ 
                type: 'init', 
                id: callbackId, 
                payload: { modelName: this.modelName } 
            });
        });
    }

    async _initStore() {
        this.store = new EdgeVecIndex({ dimensions: this.dimensions });
    }

    _registerCallback(fn) {
        const id = ++this.callbackId;
        this.pendingCallbacks.set(id, fn);
        
        this.worker.onmessage = (event) => {
            const { type, id: msgId, ...data } = event.data;
            const fn = this.pendingCallbacks.get(msgId);
            if (fn) {
                fn({ type, ...data });
            }
        };

        return id;
    }

    _generateCallbackId() {
        return ++this.callbackId;
    }

    async embedQuery(text) {
        return new Promise((resolve, reject) => {
            const callbackId = this._generateCallbackId();
            this.pendingCallbacks.set(callbackId, (message) => {
                if (message.type === 'embedQuery') {
                    resolve(message.result);
                } else if (message.type === 'error') {
                    reject(new Error(message.error));
                }
            });
            
            this.worker.postMessage({
                type: 'embedQuery',
                id: callbackId,
                payload: { text }
            });
        });
    }

    async embedDocument(text) {
        return new Promise((resolve, reject) => {
            const callbackId = this._generateCallbackId();
            this.pendingCallbacks.set(callbackId, (message) => {
                if (message.type === 'embedDocument') {
                    resolve(message.result);
                } else if (message.type === 'error') {
                    reject(new Error(message.error));
                }
            });
            
            this.worker.postMessage({
                type: 'embedDocument',
                id: callbackId,
                payload: { text }
            });
        });
    }

    async embedDocuments(texts, onProgress) {
        return new Promise((resolve, reject) => {
            const callbackId = this._generateCallbackId();
            const results = [];
            
            this.worker.onmessage = (event) => {
                const { type, id, result, error, current, total } = event.data;
                
                if (type === 'progress' && onProgress) {
                    onProgress(current, total);
                }
                
                if (id === callbackId) {
                    if (type === 'embedDocuments') {
                        resolve(result);
                    } else if (type === 'error') {
                        reject(new Error(error));
                    }
                }
            };
            
            this.worker.postMessage({
                type: 'embedDocuments',
                id: callbackId,
                payload: { texts, onProgress: true }
            });
        });
    }

    async addDocument(text, metadata = {}) {
        const vector = await this.embedDocument(text);
        const id = this.store.add(new Float32Array(vector), { text, ...metadata });
        return id;
    }

    async addDocuments(texts, onProgress) {
        const vectors = await this.embedDocuments(texts, onProgress);
        const ids = [];
        for (let i = 0; i < vectors.length; i++) {
            const id = this.store.add(new Float32Array(vectors[i]), { text: texts[i] });
            ids.push(id);
        }
        return ids;
    }

    async search(query, k = 10, options = {}) {
        const queryVector = await this.embedQuery(query);
        const results = await this.store.search(new Float32Array(queryVector), k, options);
        
        return results.map(result => ({
            id: result.id,
            score: result.score,
            text: result.metadata?.text || '',
            metadata: result.metadata
        }));
    }

    get count() {
        return this.store?.size || 0;
    }

    clear() {
        if (this.store) {
            this.store = new EdgeVecIndex({ dimensions: this.dimensions });
        }
    }

    async save(name) {
        await this.store?.save(name);
    }

    static async load(name, options = {}) {
        await ensureInit();
        const store = new LocalAIStore(options);
        store.store = await EdgeVecIndex.load(name);
        store.isReady = true;
        return store;
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingCallbacks.clear();
    }
}

export { LocalAIStore };
export default LocalAIStore;
