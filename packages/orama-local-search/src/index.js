import { create, insert, search, remove, update, getByID } from '@orama/orama';
import { persist, restore } from '@orama/plugin-data-persistence';

export class OramaLocalSearch {
    constructor(options = {}) {
        this.dimensions = options.dimensions || 512;
        this.modelName = options.modelName || 'Xenova/bge-small-zh-v1.5';
        this.db = null;
        this.extractor = null;
        this.isReady = false;
    }

    async initialize(progressCallback) {
        if (progressCallback) progressCallback(0, 2);
        
        const { pipeline } = await import('@huggingface/transformers');
        
        if (progressCallback) progressCallback(1, 2);
        
        this.extractor = await pipeline('feature-extraction', this.modelName, {
            progress_callback: (progress) => {
                if (progressCallback && progress.status === 'progress') {
                    const percent = Math.round((progress.progress || 0));
                    console.log(`模型加载: ${percent}%`);
                }
            }
        });
        
        this.db = await create({
            schema: {
                id: 'string',
                title: 'string',
                content: 'string',
                timestamp: 'number',
                embedding: `vector[${this.dimensions}]`,
                tags: 'string[]',
                category: 'string'
            }
        });
        
        if (progressCallback) progressCallback(2, 2);
        
        this.isReady = true;
    }

    async embed(text) {
        if (!this.extractor) {
            throw new Error('模型未初始化，请先调用 initialize()');
        }
        
        const output = await this.extractor(text, {
            pooling: 'mean',
            normalize: true
        });
        
        return Array.from(output.data);
    }

    async addDocument(doc) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        const embedding = await this.embed(doc.content || doc.title);
        
        const id = await insert(this.db, {
            id: doc.id || `doc_${Date.now()}`,
            title: doc.title || '',
            content: doc.content || '',
            timestamp: doc.timestamp || Date.now(),
            embedding: embedding,
            tags: doc.tags || [],
            category: doc.category || 'default'
        });
        
        return id;
    }

    async addDocuments(docs, progressCallback) {
        const results = [];
        
        for (let i = 0; i < docs.length; i++) {
            const id = await this.addDocument(docs[i]);
            results.push(id);
            
            if (progressCallback) {
                progressCallback(i + 1, docs.length);
            }
        }
        
        return results;
    }

    async search(query, options = {}) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        const queryEmbedding = await this.embed(query);
        
        const searchOptions = {
            mode: 'vector',
            vector: {
                value: queryEmbedding,
                property: 'embedding'
            },
            similarity: options.similarity || 0.5,
            limit: options.limit || 10,
            includeVectors: false
        };
        
        if (options.where) {
            searchOptions.where = options.where;
        }
        
        if (options.term) {
            searchOptions.term = options.term;
        }
        
        const results = await search(this.db, searchOptions);
        
        return results.hits.map(hit => ({
            id: hit.id,
            score: hit.score,
            document: hit.document
        }));
    }

    async hybridSearch(query, options = {}) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        const queryEmbedding = await this.embed(query);
        
        const searchOptions = {
            mode: 'hybrid',
            term: query,
            vector: {
                value: queryEmbedding,
                property: 'embedding'
            },
            similarity: options.similarity || 0.5,
            limit: options.limit || 10,
            includeVectors: false
        };
        
        if (options.where) {
            searchOptions.where = options.where;
        }
        
        const results = await search(this.db, searchOptions);
        
        return results.hits.map(hit => ({
            id: hit.id,
            score: hit.score,
            document: hit.document
        }));
    }

    async getDocument(id) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        return await getByID(this.db, id);
    }

    async updateDocument(id, updates) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        if (updates.content || updates.title) {
            updates.embedding = await this.embed(updates.content || updates.title);
        }
        
        await update(this.db, id, updates);
    }

    async deleteDocument(id) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        await remove(this.db, id);
    }

    async save(name) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        
        const data = await persist(this.db, 'json');
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('OramaLocalSearch', 1);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('databases')) {
                    db.createObjectStore('databases');
                }
            };
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(['databases'], 'readwrite');
                const store = tx.objectStore('databases');
                store.put(data, name);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async load(name) {
        const data = await new Promise((resolve, reject) => {
            const request = indexedDB.open('OramaLocalSearch', 1);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('databases')) {
                    db.createObjectStore('databases');
                }
            };
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(['databases'], 'readonly');
                const store = tx.objectStore('databases');
                const getReq = store.get(name);
                
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => reject(getReq.error);
            };
            
            request.onerror = () => reject(request.error);
        });
        
        if (data) {
            this.db = await restore('json', data);
            this.isReady = true;
            return true;
        }
        
        return false;
    }

    get count() {
        return this.db?.data?.docs?.count || 0;
    }
}

export default OramaLocalSearch;
