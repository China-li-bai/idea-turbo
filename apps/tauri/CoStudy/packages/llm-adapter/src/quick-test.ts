import { GLMAdapter } from '../src/adapters/glm-adapter';
import { ProviderConfig } from '../src/types';

// 使用提供的API key进行测试
const GLM_API_KEY = 'd946d990667549baba87595dadb30b42.5r3iUUtIbhPQ5kwA';

async function quickTest() {
  console.log('快速测试GLM API连接...\n');
  
  // 初始化配置
  const config: ProviderConfig = {
    apiKey: GLM_API_KEY,
    timeout: 10000, // 10秒超时
  };
  
  // 创建GLM适配器
  const adapter = new GLMAdapter(config);
  
  // 简单测试请求
  const request = {
    messages: [
      { role: 'user' as const, content: '你好' }
    ],
    model: 'glm-4-flash',
    max_tokens: 50,
  };
  
  try {
    console.log('发送测试请求...');
    const response = await adapter.complete(request);
    
    console.log('✅ API连接成功!');
    console.log(`响应: ${response.choices[0].message.content}`);
    return true;
  } catch (error: any) {
    console.error('❌ API连接失败');
    console.error(`错误: ${error.message}`);
    return false;
  }
}

// 运行测试
quickTest().then(success => {
  process.exit(success ? 0 : 1);
});