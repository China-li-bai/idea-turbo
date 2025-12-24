import { GLMAdapter } from '../src/adapters/glm-adapter';
import { ProviderConfig } from '../src/types';

// 使用提供的API key进行测试
const GLM_API_KEY = 'd946d990667549baba87595dadb30b42.5r3iUUtIbhPQ5kwA';

describe('GLM API Service Test', () => {
  let adapter: GLMAdapter;
  let config: ProviderConfig;

  beforeAll(() => {
    config = {
      apiKey: GLM_API_KEY,
      timeout: 30000, // 30秒超时
    };
    adapter = new GLMAdapter(config);
  });

  test('should initialize GLM adapter correctly', () => {
    expect(adapter).toBeInstanceOf(GLMAdapter);
    expect(adapter.getProviderType()).toBe('glm');
  });

  test('should get default base URL', () => {
    // 测试默认base URL是否正确
    const transformer = (adapter as any).transformer;
    expect(transformer.getDefaultBaseURL()).toBe('https://open.bigmodel.cn/api/paas/v4');
  });

  test('should transform request correctly', () => {
    // 测试请求转换是否正确
    const transformer = (adapter as any).transformer;
    const request = {
      messages: [
        { role: 'user' as const, content: '你好，请介绍一下自己' }
      ],
      model: 'glm-4-flash',
      temperature: 0.7,
    };
    
    const transformedRequest = transformer.transformRequest(request);
    
    expect(transformedRequest).toHaveProperty('model', 'glm-4-flash');
    expect(transformedRequest).toHaveProperty('messages');
    expect(transformedRequest.messages).toHaveLength(1);
    expect(transformedRequest.messages[0]).toHaveProperty('role', 'user');
    expect(transformedRequest.messages[0]).toHaveProperty('content', '你好，请介绍一下自己');
    expect(transformedRequest).toHaveProperty('temperature', 0.7);
  });

  test('should get auth headers correctly', () => {
    // 测试认证头是否正确
    const transformer = (adapter as any).transformer;
    const authHeaders = transformer.getAuthHeaders(config);
    
    expect(authHeaders).toHaveProperty('Authorization');
    expect(authHeaders.Authorization).toBe(`Bearer ${GLM_API_KEY}`);
  });

  // 这个测试需要实际连接到GLM API，可能需要较长时间
  // 在CI/CD环境中可能需要跳过或使用mock
  test.skip('should connect to GLM API and get response', async () => {
    const request = {
      messages: [
        { role: 'user' as const, content: '你好，请简单介绍一下自己，不超过50字' }
      ],
      model: 'glm-4-flash',
      temperature: 0.7,
      max_tokens: 100,
    };

    try {
      const response = await adapter.complete(request);
      
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('object');
      expect(response).toHaveProperty('created');
      expect(response).toHaveProperty('model');
      expect(response).toHaveProperty('choices');
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0]).toHaveProperty('message');
      expect(response.choices[0].message).toHaveProperty('role', 'assistant');
      expect(response.choices[0].message).toHaveProperty('content');
      expect(typeof response.choices[0].message.content).toBe('string');
      expect(response.choices[0].message.content.length).toBeGreaterThan(0);
      
      console.log('GLM API 响应内容:', response.choices[0].message.content);
    } catch (error) {
      console.error('GLM API 连接错误:', error);
      throw error;
    }
  }, 30000); // 30秒超时

  // 测试流式响应
  test.skip('should stream response from GLM API', async () => {
    const request = {
      messages: [
        { role: 'user' as const, content: '请用3句话介绍人工智能的发展历史' }
      ],
      model: 'glm-4-flash',
      temperature: 0.7,
      max_tokens: 200,
      stream: true,
    };

    try {
      const events = [];
      for await (const event of adapter.stream(request)) {
        events.push(event);
        
        if (event.type === 'done') {
          break;
        }
      }
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('type', 'content');
      
      // 检查是否有内容事件
      const contentEvents = events.filter(e => e.type === 'content');
      expect(contentEvents.length).toBeGreaterThan(0);
      
      // 检查是否有完成事件
      const doneEvent = events.find(e => e.type === 'done');
      expect(doneEvent).toBeDefined();
      
      console.log('流式响应事件数量:', events.length);
    } catch (error) {
      console.error('GLM API 流式连接错误:', error);
      throw error;
    }
  }, 30000); // 30秒超时
});