import { GLMAdapter } from '../src/adapters/glm-adapter';
import { ProviderConfig } from '../src/types';

// 使用提供的API key进行测试
const GLM_API_KEY = 'd946d990667549baba87595dadb30b42.5r3iUUtIbhPQ5kwA';

async function testGLMAPI() {
  console.log('开始测试GLM API服务...\n');
  
  // 初始化配置
  const config: ProviderConfig = {
    apiKey: GLM_API_KEY,
    timeout: 30000, // 30秒超时
  };
  
  // 创建GLM适配器
  const adapter = new GLMAdapter(config);
  
  console.log('1. 适配器初始化测试');
  console.log(`   - 适配器类型: ${adapter.getProviderType()}`);
  console.log(`   - API Key: ${GLM_API_KEY.substring(0, 10)}...`);
  console.log('   ✅ 适配器初始化成功\n');
  
  // 测试基本请求
  console.log('2. 基本请求测试');
  const request = {
    messages: [
      { role: 'user' as const, content: '你好，请简单介绍一下自己，不超过50字' }
    ],
    model: 'glm-4-flash',
    temperature: 0.7,
    max_tokens: 100,
  };
  
  try {
    console.log('   - 发送请求中...');
    const response = await adapter.complete(request);
    
    console.log('   ✅ 请求成功');
    console.log(`   - 响应ID: ${response.id}`);
    console.log(`   - 模型: ${response.model}`);
    console.log(`   - 响应内容: ${response.choices[0].message.content}`);
    
    if (response.usage) {
      console.log(`   - Token使用: 输入${response.usage.prompt_tokens}，输出${response.usage.completion_tokens}，总计${response.usage.total_tokens}`);
    }
  } catch (error: any) {
    console.error('   ❌ 请求失败');
    console.error(`   - 错误信息: ${error.message}`);
    if (error.statusCode) {
      console.error(`   - 状态码: ${error.statusCode}`);
    }
    return;
  }
  
  console.log('\n3. 流式请求测试');
  const streamRequest = {
    messages: [
      { role: 'user' as const, content: '请用3句话介绍人工智能的发展历史' }
    ],
    model: 'glm-4-flash',
    temperature: 0.7,
    max_tokens: 200,
    stream: true,
  };
  
  try {
    console.log('   - 发送流式请求中...');
    let fullContent = '';
    let eventCount = 0;
    
    for await (const event of adapter.stream(streamRequest)) {
      eventCount++;
      
      if (event.type === 'content' && event.content) {
        fullContent += event.content;
        process.stdout.write(event.content); // 实时输出内容
      }
      
      if (event.type === 'done') {
        console.log('\n   ✅ 流式请求完成');
        console.log(`   - 总事件数: ${eventCount}`);
        console.log(`   - 完整内容: ${fullContent}`);
        break;
      }
      
      if (event.type === 'error') {
        console.error(`\n   ❌ 流式请求错误: ${event.error}`);
        break;
      }
    }
  } catch (error: any) {
    console.error('   ❌ 流式请求失败');
    console.error(`   - 错误信息: ${error.message}`);
    if (error.statusCode) {
      console.error(`   - 状态码: ${error.statusCode}`);
    }
  }
  
  console.log('\n✅ GLM API服务测试完成');
}

// 运行测试
testGLMAPI().catch(console.error);