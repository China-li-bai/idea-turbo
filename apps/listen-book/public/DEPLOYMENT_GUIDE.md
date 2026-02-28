# GitHub 大文件部署指南

## 问题说明

GitHub 有严格的文件大小限制：
- **单文件限制**：100MB
- **仓库总大小建议**：< 1GB
- **推送限制**：单次推送不超过 2GB

我们的模型文件：
```
190MB  sherpa-onnx-wasm-main-asr.data  ❌ 超过限制
 39MB  encoder-epoch-99-avg-1.onnx     ✅ 可以上传
 21MB  encoder-epoch-99-avg-1.int8.onnx ✅ 可以上传
 11MB  sherpa-onnx-wasm-main-asr.wasm  ✅ 可以上传
```

## 解决方案：GitHub Release + jsDelivr CDN

### 方案优势

✅ **绕过文件限制**：GitHub Release 支持单文件最大 2GB
✅ **免费 CDN**：jsDelivr 提供免费 CDN 加速
✅ **全球加速**：jsDelivr 有全球 CDN 节点
✅ **稳定可靠**：GitHub + jsDelivr 组合非常稳定

### 部署步骤

#### 步骤 1：创建 GitHub Release

1. 访问你的仓库：https://github.com/China-li-bai/sherpa-onnx-models
2. 点击 **Releases** → **Create a new release**
3. 填写信息：
   - **Tag version**: `v1.0.0`
   - **Release title**: `SherpaOnnx Models v1.0.0`
   - **Description**: 
     ```markdown
     # SherpaOnnx Models v1.0.0
     
     Offline speech recognition models for SherpaOnnx.
     
     ## Files
     - sherpa-onnx-wasm-main-asr.data (190MB)
     - sherpa-onnx-wasm-main-asr.wasm (11MB)
     - models/ directory
     
     ## Usage
     Use jsDelivr CDN to access these files:
     https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0/
     ```

#### 步骤 2：上传文件到 Release

**方式 1：手动上传（推荐）**

1. 在 Release 页面，找到 **Attach binaries** 区域
2. 拖拽或选择文件上传：
   ```
   ✅ sherpa-onnx-wasm-main-asr.data (190MB)
   ✅ sherpa-onnx-wasm-main-asr.wasm (11MB)
   ✅ models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx
   ✅ models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.int8.onnx
   ✅ models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.onnx
   ✅ models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.int8.onnx
   ✅ models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.onnx
   ✅ models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.int8.onnx
   ✅ models/sherpa-onnx-streaming-zh-14M-2023-02-23/tokens.txt
   ```

**方式 2：使用 GitHub CLI**

```bash
# 安装 GitHub CLI
brew install gh

# 登录
gh auth login

# 创建 Release 并上传文件
cd /Users/mac/project/idea-turbo/apps/listen-book/public

gh release create v1.0.0 \
  sherpa-onnx-wasm-main-asr.data \
  sherpa-onnx-wasm-main-asr.wasm \
  models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/*.onnx \
  models/sherpa-onnx-streaming-zh-14M-2023-02-23/tokens.txt \
  --repo China-li-bai/sherpa-onnx-models \
  --title "SherpaOnnx Models v1.0.0" \
  --notes "Offline speech recognition models"
```

#### 步骤 3：使用 jsDelivr CDN

上传完成后，文件可以通过 jsDelivr CDN 访问：

```
https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0/sherpa-onnx-wasm-main-asr.data
https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0/sherpa-onnx-wasm-main-asr.wasm
https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0/models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx
```

#### 步骤 4：配置应用

在 `.env.local` 中添加：

```bash
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.0
```

## 替代方案

### 方案 2：阿里云 OSS

**优势**：
- 国内访问速度快
- 支持 CDN 加速
- 成本低（约 130元/月）

**步骤**：
```bash
# 1. 安装 ossutil
brew install ossutil

# 2. 配置
ossutil config -e oss-cn-hangzhou.aliyuncs.com -i YOUR_ACCESS_KEY_ID -k YOUR_ACCESS_KEY_SECRET

# 3. 上传
ossutil cp -r public/sherpa-onnx-wasm-main-asr.data oss://your-bucket/sherpa-onnx/
ossutil cp -r public/sherpa-onnx-wasm-main-asr.wasm oss://your-bucket/sherpa-onnx/
ossutil cp -r public/models oss://your-bucket/sherpa-onnx/models

# 4. 设置公开读
ossutil set-acl oss://your-bucket/sherpa-onnx public-read -r

# 5. 配置 CDN URL
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-bucket.oss-cn-hangzhou.aliyuncs.com/sherpa-onnx
```

### 方案 3：Cloudflare R2 + Workers

**优势**：
- 免费额度大
- 全球 CDN
- 无出站流量费用

**步骤**：
```bash
# 1. 安装 wrangler
npm install -g wrangler

# 2. 登录
wrangler login

# 3. 创建 R2 bucket
wrangler r2 bucket create sherpa-onnx-models

# 4. 上传文件
wrangler r2 object put sherpa-onnx-models/sherpa-onnx-wasm-main-asr.data --file=public/sherpa-onnx-wasm-main-asr.data
wrangler r2 object put sherpa-onnx-models/sherpa-onnx-wasm-main-asr.wasm --file=public/sherpa-onnx-wasm-main-asr.wasm

# 5. 创建 Worker 提供公开访问
# 创建 worker.js
cat > worker.js << 'EOF'
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const object = await env.SHERPA_ONNX.get(url.pathname.slice(1));
    
    if (!object) {
      return new Response('Not found', { status: 404 });
    }
    
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
EOF

# 6. 部署 Worker
wrangler deploy

# 7. 配置 CDN URL
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-worker.your-subdomain.workers.dev
```

## 成本对比

| 方案 | 存储成本 | 流量成本 | 总成本/月 | 优势 |
|------|---------|---------|----------|------|
| **GitHub Release + jsDelivr** | 免费 | 免费 | **免费** | 完全免费，全球 CDN |
| 阿里云 OSS | 0.03元 | 130元 | 130元 | 国内速度快 |
| 腾讯云 COS | 0.03元 | 130元 | 130元 | 国内速度快 |
| Cloudflare R2 | 免费 | 免费 | **免费** | 免费额度大，全球 CDN |
| AWS S3 | $0.023/GB | $0.09/GB | ~$25 | 功能强大 |

## 推荐方案

**个人项目/开源项目**：
- ✅ **GitHub Release + jsDelivr**（免费，推荐）

**商业项目/国内用户**：
- ✅ **阿里云 OSS** 或 **腾讯云 COS**（速度快，稳定）

**全球用户**：
- ✅ **Cloudflare R2**（免费，全球 CDN）

## 常见问题

### Q1: jsDelivr 在国内访问速度如何？

A: jsDelivr 在国内有 ICP 备案，访问速度很快。但建议同时准备阿里云 OSS 作为备用。

### Q2: GitHub Release 有流量限制吗？

A: GitHub Release 没有明确的流量限制，但建议使用 jsDelivr CDN 来减轻 GitHub 的负担。

### Q3: 如何更新模型？

A: 创建新的 Release（如 v1.0.1），然后更新环境变量：
```bash
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://cdn.jsdelivr.net/gh/China-li-bai/sherpa-onnx-models@v1.0.1
```

### Q4: 文件下载失败怎么办？

A: 检查以下几点：
1. CDN URL 是否正确
2. 文件是否成功上传到 Release
3. 网络连接是否正常
4. 浏览器控制台是否有 CORS 错误

## 下一步

1. **创建 GitHub Release**：访问 https://github.com/China-li-bai/sherpa-onnx-models/releases/new
2. **上传模型文件**：手动上传或使用 GitHub CLI
3. **配置环境变量**：设置 `NEXT_PUBLIC_SHERPA_ONNX_CDN`
4. **测试效果**：首次访问从 CDN 下载，二次访问从缓存加载

完成这些步骤后，你的应用就可以正常使用远程模型了！
