export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 处理 CORS 预检请求
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

    // 获取文件名
    let filename = url.pathname.slice(1);
    
    // 如果没有指定文件名，返回文件列表
    if (!filename) {
      return new Response(JSON.stringify({
        files: [
          'sherpa-onnx-wasm-main-asr.wasm',
          'sherpa-onnx-wasm-main-asr.data',
          'sherpa-onnx-asr.js',
          'sherpa-onnx-wasm-main-asr.js'
        ],
        usage: 'Append filename to URL, e.g., /sherpa-onnx-wasm-main-asr.wasm'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 构建目标 URL
    const targetUrl = `${env.GITHUB_RELEASE_URL}/${filename}`;
    console.log(`Proxying: ${targetUrl}`);

    try {
      // 获取文件
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Cloudflare-Workers-Proxy',
        },
      });

      if (!response.ok) {
        return new Response(`Failed to fetch: ${response.status}`, {
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 创建新响应，添加 CORS 头
      const newResponse = new Response(response.body, response);
      
      // 设置 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');
      
      // 设置缓存（1天）
      newResponse.headers.set('Cache-Control', 'public, max-age=86400');
      
      // 设置正确的 Content-Type
      if (filename.endsWith('.wasm')) {
        newResponse.headers.set('Content-Type', 'application/wasm');
      } else if (filename.endsWith('.data')) {
        newResponse.headers.set('Content-Type', 'application/octet-stream');
      } else if (filename.endsWith('.js')) {
        newResponse.headers.set('Content-Type', 'application/javascript');
      }

      return newResponse;
    } catch (error) {
      return new Response(`Error: ${error.message}`, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
