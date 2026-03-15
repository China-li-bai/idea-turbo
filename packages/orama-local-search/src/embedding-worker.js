import { pipeline } from '@huggingface/transformers';

let extractor = null;

self.onmessage = async (e) => {
    const { type, id, payload } = e.data;
    
    switch (type) {
        case 'init':
            try {
                extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5', {
                    progress_callback: (progress) => {
                        if (progress.status === 'progress') {
                            self.postMessage({
                                type: 'progress',
                                id,
                                payload: {
                                    progress: progress.progress,
                                    loaded: progress.loaded,
                                    total: progress.total
                                }
                            });
                        }
                    }
                });
                
                self.postMessage({ type: 'ready', id });
            } catch (error) {
                self.postMessage({ type: 'error', id, payload: error.message });
            }
            break;
            
        case 'embed':
            if (!extractor) {
                self.postMessage({ type: 'error', id, payload: '模型未初始化' });
                return;
            }
            
            try {
                const output = await extractor(payload.text, {
                    pooling: 'mean',
                    normalize: true
                });
                
                const embedding = Array.from(output.data);
                
                self.postMessage({ type: 'embedding', id, payload: { embedding } });
            } catch (error) {
                self.postMessage({ type: 'error', id, payload: error.message });
            }
            break;
            
        case 'embedBatch':
            if (!extractor) {
                self.postMessage({ type: 'error', id, payload: '模型未初始化' });
                return;
            }
            
            try {
                const embeddings = [];
                
                for (let i = 0; i < payload.texts.length; i++) {
                    const output = await extractor(payload.texts[i], {
                        pooling: 'mean',
                        normalize: true
                    });
                    
                    embeddings.push(Array.from(output.data));
                    
                    self.postMessage({
                        type: 'batchProgress',
                        id,
                        payload: {
                            current: i + 1,
                            total: payload.texts.length
                        }
                    });
                }
                
                self.postMessage({ type: 'embeddings', id, payload: { embeddings } });
            } catch (error) {
                self.postMessage({ type: 'error', id, payload: error.message });
            }
            break;
    }
};
