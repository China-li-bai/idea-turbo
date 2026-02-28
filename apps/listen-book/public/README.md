# SherpaOnnx Models

Offline speech recognition models for SherpaOnnx.

## CDN Access

These models are served via **GitHub Release + jsDelivr CDN**.

### CDN URL
```
https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0/
```

## Files

- `sherpa-onnx-wasm-main-asr.data` (190MB) - Main model data
- `sherpa-onnx-wasm-main-asr.wasm` (11MB) - WebAssembly binary
- `models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/` - Model files
  - `encoder-epoch-99-avg-1.onnx` (39MB)
  - `encoder-epoch-99-avg-1.int8.onnx` (21MB)
  - `decoder-epoch-99-avg-1.onnx`
  - `decoder-epoch-99-avg-1.int8.onnx`
  - `joiner-epoch-99-avg-1.onnx`
  - `joiner-epoch-99-avg-1.int8.onnx`
  - `tokens.txt`

## Usage

```typescript
import { SherpaOnnxEngine, RecognitionConfig } from './lib/recognition';

const config: RecognitionConfig = {
  engine: 'sherpa-onnx',
  language: 'zh-CN',
  remoteResources: {
    baseUrl: 'https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0',
    files: {
      wasm: 'sherpa-onnx-wasm-main-asr.wasm',
      data: 'sherpa-onnx-wasm-main-asr.data',
      encoder: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx',
      encoderInt8: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.int8.onnx',
      decoder: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.onnx',
      decoderInt8: 'models/sherpa-onnx-streaming-zh-14M-2023-02-23/decoder-epoch-99-avg-1.int8.onnx',
      joiner: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.onnx',
      joinerInt8: 'models/sherpa-onnx-streaming-zh-14M-2023-02-23/joiner-epoch-99-avg-1.int8.onnx',
      tokens: 'models/sherpa-onnx-streaming-zh-14M-2023-02-23/tokens.txt'
    }
  }
};
```

## Deployment

Due to GitHub's 100MB file size limit, large files are uploaded via GitHub Release.

## License

Same as SherpaOnnx project.
