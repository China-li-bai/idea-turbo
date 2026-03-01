---
name: "large-file-cdn"
description: "Solves GitHub 100MB file limit by providing CDN solutions. Invoke when files exceed 100MB, CORS issues with GitHub Release, or need CDN for large assets."
---

# Large File CDN Solutions

Solves the problem of hosting files larger than 100MB that cannot be uploaded to GitHub repository.

## Problem Statement

GitHub has strict file size limits:
- **Repository**: 100MB per file limit
- **Release**: 2GB per file, but **no CORS support**
- **LFS**: Requires paid plan for large storage

## Solution Comparison

| Solution | CORS | Free Tier | Speed (China) | Complexity |
|----------|------|-----------|---------------|------------|
| **Cloudflare Worker** | ✅ | 100k req/day | Medium | Low |
| **阿里云 OSS** | ✅ | Limited | Fast | Medium |
| **腾讯云 COS** | ✅ | Limited | Fast | Medium |
| **Hugging Face** | ✅ | Unlimited | Slow | Low |
| **jsDelivr + Release** | ❌ | Unlimited | Fast | N/A |

## Solution 1: Cloudflare Worker Proxy (Recommended)

### How It Works

```
Browser → Cloudflare Worker → GitHub Release → Worker (add CORS) → Browser
```

### Step 1: Create Worker Directory

```bash
mkdir -p cloudflare-worker/src
cd cloudflare-worker
```

### Step 2: Create wrangler.toml

```toml
name = "your-cdn-name"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
GITHUB_RELEASE_URL = "https://github.com/username/repo/releases/download/tag"
```

### Step 3: Create Worker Code (src/index.js)

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Get filename from path
    let filename = url.pathname.slice(1);
    
    if (!filename) {
      return new Response(JSON.stringify({
        files: ['file1.wasm', 'file2.data'],
        usage: 'Append filename to URL'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Proxy to GitHub Release
    const targetUrl = `${env.GITHUB_RELEASE_URL}/${filename}`;

    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Cloudflare-Workers-Proxy' },
      });

      if (!response.ok) {
        return new Response(`Failed: ${response.status}`, {
          status: response.status,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Cache-Control', 'public, max-age=86400');
      
      // Set correct Content-Type
      if (filename.endsWith('.wasm')) {
        newResponse.headers.set('Content-Type', 'application/wasm');
      } else if (filename.endsWith('.data')) {
        newResponse.headers.set('Content-Type', 'application/octet-stream');
      }

      return newResponse;
    } catch (error) {
      return new Response(`Error: ${error.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
```

### Step 4: Deploy

```bash
# Login (first time)
npx wrangler login

# Deploy
npx wrangler deploy
```

### Step 5: Use in Code

```typescript
const CDN_URL = 'https://your-worker.your-subdomain.workers.dev';
const fileUrl = `${CDN_URL}/your-file.data`;
```

## Solution 2: 阿里云 OSS

### Step 1: Create Bucket

1. Login to 阿里云 OSS Console
2. Create bucket with public read access
3. Enable CORS in bucket settings

### Step 2: Configure CORS

```json
[
  {
    "allowedOrigin": ["*"],
    "allowedMethod": ["GET", "HEAD"],
    "allowedHeader": ["*"],
    "exposeHeader": [],
    "maxAgeSeconds": 86400
  }
]
```

### Step 3: Upload Files

```bash
# Using ossutil
ossutil cp large-file.data oss://your-bucket/path/

# Or use web console
```

### Step 4: Use in Code

```typescript
const CDN_URL = 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com';
```

## Solution 3: Hugging Face

### Step 1: Create Repository

1. Go to https://huggingface.co/new
2. Create a model/dataset repository

### Step 2: Upload Files

```bash
# Install huggingface_hub
pip install huggingface_hub

# Upload
huggingface-cli upload your-username/your-repo ./local-file.data
```

### Step 3: Use in Code

```typescript
const CDN_URL = 'https://huggingface.co/your-username/your-repo/resolve/main';
const fileUrl = `${CDN_URL}/your-file.data`;
```

## Decision Matrix

### Choose Cloudflare Worker When:
- ✅ Files already on GitHub Release
- ✅ Need quick setup (5 minutes)
- ✅ Moderate traffic (< 100k requests/day)
- ✅ Free tier is sufficient

### Choose 阿里云/腾讯云 OSS When:
- ✅ High traffic expected
- ✅ Need fast China access
- ✅ Have existing cloud account
- ✅ Need more control over CDN

### Choose Hugging Face When:
- ✅ ML model files
- ✅ Open source project
- ✅ Unlimited free storage needed
- ✅ International audience

## Common Issues

### Issue 1: CORS Error

**Symptom**: `Access-Control-Allow-Origin` header missing

**Solution**: Use Cloudflare Worker proxy (adds CORS headers)

### Issue 2: 302 Redirect

**Symptom**: GitHub Release returns 302, browser fails

**Solution**: Cloudflare Worker follows redirects automatically

### Issue 3: Slow Download

**Symptom**: Large files download slowly

**Solution**: 
- Use 阿里云/腾讯云 for China users
- Enable Cloudflare caching
- Consider file compression

## Implementation Checklist

- [ ] Check file sizes (must be < 2GB for GitHub Release)
- [ ] Upload files to GitHub Release
- [ ] Create Cloudflare Worker
- [ ] Configure CORS headers
- [ ] Test with curl/browser
- [ ] Update code to use Worker URL
- [ ] Monitor usage in Cloudflare dashboard

## Example: Sherpa-ONNX Models

```typescript
// Before (fails due to CORS)
const url = 'https://github.com/user/repo/releases/download/v1.0/model.data';

// After (works with CORS)
const WORKER_URL = 'https://sherpa-onnx-cdn.123456.workers.dev';
const url = `${WORKER_URL}/model.data`;
```

## Cost Estimation

### Cloudflare Worker Free Tier
- 100,000 requests/day
- 10ms CPU time per request
- Sufficient for most projects

### 阿里云 OSS
- Storage: ¥0.12/GB/month
- Traffic: ¥0.5/GB
- Example: 200GB storage + 100GB traffic = ¥74/month
