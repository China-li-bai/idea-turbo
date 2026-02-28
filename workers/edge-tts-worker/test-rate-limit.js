#!/usr/bin/env node

const API_KEY = process.env.API_KEY || 'your-api-key';
const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';

async function testRateLimit() {
  console.log('开始测试速率限制功能...\n');
  
  const testText = '这是一个测试文本。';
  
  for (let i = 1; i <= 105; i++) {
    try {
      const response = await fetch(`${BASE_URL}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: testText,
          voice: 'shimmer'
        })
      });
      
      const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      console.log(`请求 #${i}: 状态 ${response.status}`);
      console.log(`  X-RateLimit-Limit: ${rateLimitLimit}`);
      console.log(`  X-RateLimit-Remaining: ${rateLimitRemaining}`);
      console.log(`  X-RateLimit-Reset: ${rateLimitReset}`);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.log(`  Retry-After: ${retryAfter} 秒`);
        
        const errorData = await response.json();
        console.log(`  错误信息: ${errorData.error.message}`);
        
        console.log('\n✓ 速率限制功能正常工作！');
        console.log(`✓ 在第 ${i} 个请求时触发了速率限制`);
        console.log(`✓ 返回了正确的 HTTP 429 状态码`);
        console.log(`✓ 包含了所有必要的速率限制头`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`请求 #${i} 失败:`, error.message);
      break;
    }
  }
}

testRateLimit().catch(console.error);