export const SAMPLE_RATE = 24000;
export const MODEL_CONTEXT_WINDOW = 512;
export const MODEL_REVISION = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
export const HUGGINGFACE_REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const CDN_BASE_URL = `https://huggingface.co/${HUGGINGFACE_REPO}/resolve/${MODEL_REVISION}`;

export const ONNX_RUNTIME_VERSION = '1.21.0-dev.20250206-d981b153d3';
export const ONNX_RUNTIME_WASM_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ONNX_RUNTIME_VERSION}/dist/`;

export const ESPEAK_NG_WASM_URL = 'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/dist/espeak-ng.wasm';

export const WINDOW_SIZE = 256;
export const BUFFER_SAMPLES = 256;
