# SherpaOnnx 远程资源部署指南

## 概述

SherpaOnnx 模型文件较大（总计约 260MB），不建议直接提交到 Git。本指南说明如何将模型文件部署到远程服务器（CDN/OSS）并配置应用从远程下载。

## 大文件列表

```
190MB  sherpa-onnx-wasm-main-asr.data
 39MB  models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx
 21MB  models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.int8.onnx
 11MB  sherpa-onnx-wasm-main-asr.wasm
```

## 部署方案

### 方案 1：阿里云 OSS

```bash
# 1. 安装 ossutil
brew install ossutil

# 2. 配置 AccessKey
ossutil config -e oss-cn-hangzhou.aliyuncs.com -i YOUR_ACCESS_KEY_ID -k YOUR_ACCESS_KEY_SECRET

# 3. 上传文件
ossutil cp -r public/sherpa-onnx-wasm-main-asr.data oss://your-bucket/sherpa-onnx/
ossutil cp -r public/sherpa-onnx-wasm-main-asr.wasm oss://your-bucket/sherpa-onnx/
ossutil cp -r public/models oss://your-bucket/sherpa-onnx/models

# 4. 设置公开读
ossutil set-acl oss://your-bucket/sherpa-onnx public-read -r
```

### 方案 2：腾讯云 COS

```bash
# 1. 安装 coscmd
pip install coscmd

# 2. 配置 SecretId 和 SecretKey
coscmd config -a YOUR_SECRET_ID -s YOUR_SECRET_KEY -b your-bucket -r ap-guangzhou

# 3. 上传文件
coscmd upload -r public/sherpa-onnx-wasm-main-asr.data /sherpa-onnx/
coscmd upload -r public/sherpa-onnx-wasm-main-asr.wasm /sherpa-onnx/
coscmd upload -r public/models /sherpa-onnx/models
```

### 方案 3：AWS S3

```bash
# 1. 配置 AWS CLI
aws configure

# 2. 上传文件
aws s3 sync public/ s3://your-bucket/sherpa-onnx/ --exclude "*" --include "sherpa-onnx-*" --include "models/*"

# 3. 设置公开读
aws s3api put-bucket-policy --bucket your-bucket --policy file://policy.json
```

### 方案 4：Cloudflare R2

```bash
# 1. 安装 wrangler
npm install -g wrangler

# 2. 登录
wrangler login

# 3. 上传文件
wrangler r2 object put your-bucket/sherpa-onnx/sherpa-onnx-wasm-main-asr.data --file=public/sherpa-onnx-wasm-main-asr.data
wrangler r2 object put your-bucket/sherpa-onnx/sherpa-onnx-wasm-main-asr.wasm --file=public/sherpa-onnx-wasm-main-asr.wasm
wrangler r2 object put your-bucket/sherpa-onnx/models/encoder-epoch-99-avg-1.onnx --file=public/models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx
```

### 方案 5：GitHub Pages（免费）

```bash
# 1. 创建新仓库
mkdir sherpa-onnx-models
cd sherpa-onnx-models
git init

# 2. 复制文件
cp -r ../public/sherpa-onnx-* .
cp -r ../public/models .

# 3. 推送到 GitHub
git add .
git commit -m "Add sherpa-onnx models"
git remote add origin https://github.com/your-username/sherpa-onnx-models.git
git push -u origin main

# 4. 启用 GitHub Pages
# Settings -> Pages -> Source: main branch -> Save

# 5. 等待部署完成
# URL: https://your-username.github.io/sherpa-onnx-models/
```

## 配置应用

### 环境变量配置

在 `.env.local` 或 `.env.production` 中添加：

```bash
# 阿里云 OSS
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-bucket.oss-cn-hangzhou.aliyuncs.com/sherpa-onnx

# 腾讯云 COS
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-bucket.cos.ap-guangzhou.myqcloud.com/sherpa-onnx

# AWS S3
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-bucket.s3.amazonaws.com/sherpa-onnx

# Cloudflare R2
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-bucket.your-account.r2.cloudflarestorage.com/sherpa-onnx

# GitHub Pages
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-username.github.io/sherpa-onnx-models
```

### 代码中使用

```typescript
import { SherpaOnnxEngine, RecognitionConfig } from './lib/recognition';

const config: RecognitionConfig = {
  engine: 'sherpa-onnx',
  language: 'zh-CN',
  continuous: true,
  interimResults: true,
  silenceTimeout: 3000,
  minConfidence: 0.5,
  enableVolumeDetection: true,
  enableRealtimePreview: true,
  remoteResources: {
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
      tokens: 'models/sherpa-onnx-streaming-zh-14M-2023-02-23/tokens.txt'
    }
  }
};

const engine = new SherpaOnnxEngine(config, callbacks);
await engine.initialize();
```

## 缓存机制

### 首次加载

1. 检查 IndexedDB 缓存
2. 缓存不存在，从 CDN 下载
3. 下载完成后缓存到 IndexedDB
4. 下次访问直接使用缓存

### 二次加载

1. 检查 IndexedDB 缓存
2. 缓存存在，直接使用（<1秒）
3. 无需重新下载

### 版本更新

1. 修改 `MODEL_VERSION` 版本号
2. 自动检测版本不匹配
3. 删除旧缓存，下载新版本

## CDN 配置建议

### 缓存策略

```
Cache-Control: public, max-age=31536000, immutable
```

### CORS 配置

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### 性能优化

1. **启用 CDN 加速**：使用全球 CDN 节点
2. **启用 Gzip 压缩**：减少传输大小
3. **启用 HTTP/2**：多路复用，提高加载速度
4. **设置缓存头**：浏览器缓存 + CDN 缓存

## 成本估算

### 阿里云 OSS（杭州）

- 存储：260MB × 0.12元/GB/月 = 0.03元/月
- 流量：假设 1000 次下载/月 = 260GB × 0.5元/GB = 130元/月
- **总计：约 130元/月**

### 腾讯云 COS（广州）

- 存储：260MB × 0.118元/GB/月 = 0.03元/月
- 流量：假设 1000 次下载/月 = 260GB × 0.5元/GB = 130元/月
- **总计：约 130元/月**

### GitHub Pages（免费）

- 存储：免费（最大 1GB）
- 流量：免费（最大 100GB/月）
- **总计：免费**

## 故障排查

### 问题 1：CORS 错误

```
Access to fetch at 'https://your-cdn.com/...' from origin 'https://your-app.com' 
has been blocked by CORS policy
```

**解决方案**：在 CDN 配置中添加 CORS 规则

### 问题 2：下载失败

```
Failed to fetch model from https://your-cdn.com/...
```

**解决方案**：
1. 检查 CDN URL 是否正确
2. 检查文件是否公开可访问
3. 检查网络连接

### 问题 3：缓存损坏

```
Model cache corrupted
```

**解决方案**：
1. 清除浏览器缓存
2. 点击"清除模型缓存"按钮
3. 重新加载页面

## 最佳实践

1. **使用 CDN**：提高全球访问速度
2. **启用缓存**：减少重复下载
3. **版本管理**：通过版本号控制更新
4. **监控流量**：定期检查 CDN 流量
5. **备用方案**：准备多个 CDN 源

## 相关文件

- [modelCacheManager.ts](./modelCacheManager.ts) - 缓存管理器
- [sherpaOnnxEngine.ts](./sherpaOnnxEngine.ts) - SherpaOnnx 引擎
- [config.ts](./config.ts) - 配置文件
- [index.ts](./index.ts) - 导出文件
