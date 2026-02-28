import { RecognitionConfig, RemoteResourceConfig } from './engine';

export const DEFAULT_REMOTE_CONFIG: RemoteResourceConfig = {
  baseUrl: 'https://your-cdn.com/sherpa-onnx',
  files: {
    wasm: 'sherpa-onnx-wasm-main-asr.wasm',
    data: 'sherpa-onnx-wasm-main-asr.data',
    encoder: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx',
    encoderInt8: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.int8.onnx',
    decoder: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.onnx',
    decoderInt8: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.int8.onnx',
    joiner: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.onnx',
    joinerInt8: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.int8.onnx',
    tokens: 'models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/tokens.txt'
  }
};

export const createRecognitionConfig = (
  remoteConfig?: RemoteResourceConfig
): RecognitionConfig => ({
  engine: 'sherpa-onnx',
  language: 'zh-CN',
  continuous: true,
  interimResults: true,
  silenceTimeout: 3000,
  minConfidence: 0.5,
  enableVolumeDetection: true,
  enableRealtimePreview: true,
  remoteResources: remoteConfig || DEFAULT_REMOTE_CONFIG
});

export const CDN_PROVIDERS = {
  ALIYUN_OSS: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com/sherpa-onnx',
  TENCENT_COS: 'https://your-bucket.cos.ap-guangzhou.myqcloud.com/sherpa-onnx',
  AWS_S3: 'https://your-bucket.s3.amazonaws.com/sherpa-onnx',
  CLOUDFLARE_R2: 'https://your-bucket.your-account.r2.cloudflarestorage.com/sherpa-onnx',
  GITHUB_PAGES: 'https://your-username.github.io/your-repo/sherpa-onnx'
};
