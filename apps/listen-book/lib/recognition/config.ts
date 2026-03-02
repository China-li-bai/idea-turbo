import { RecognitionConfig, RemoteResourceConfig } from '@idea-turbo/sherpa-onnx';

const CDN_BASE_URL = process.env.NEXT_PUBLIC_SHERPA_ONNX_CDN || 'https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@1.0.0';

export const DEFAULT_REMOTE_CONFIG: RemoteResourceConfig = {
  baseUrl: CDN_BASE_URL,
  files: {
    data: 'sherpa-onnx-wasm-main-asr.data',
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
