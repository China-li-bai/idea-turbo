# GLM API 测试指南

本目录包含用于测试GLM (智谱AI) API连接的测试脚本。

## 测试文件

1. **quick-test.ts** - 快速API连接测试
   - 最简单的测试，验证API是否可用
   - 使用方法: `npx tsx src/quick-test.ts`

2. **test-glm-api.ts** - 完整API功能测试
   - 包含基本请求和流式请求测试
   - 使用方法: `npx tsx src/test-glm-api.ts`

3. **glm-adapter.test.ts** - Jest单元测试
   - 包含适配器的单元测试
   - 使用方法: `npm test` (需要配置Jest)

## 使用前准备

1. 确保已安装依赖:
   ```bash
   npm install tsx
   ```

2. API key已配置在测试文件中:
   ```
   d946d990667549baba87595dadb30b42.5r3iUUtIbhPQ5kwA
   ```

## 测试结果

如果测试成功，你应该看到类似以下的输出:

```
快速测试GLM API连接...

发送测试请求...
✅ API连接成功!
响应: 你好👋！很高兴见到你，有什么可以帮助你的吗？
```

## 故障排除

如果测试失败，可能的原因:

1. **API Key无效** - 检查API key是否正确
2. **网络问题** - 检查网络连接
3. **API端点变更** - 检查GLM API文档是否有更新
4. **模型不可用** - 尝试更换模型名称

## GLM API信息

- **基础URL**: `https://open.bigmodel.cn/api/paas/v4`
- **端点**: `/chat/completions`
- **免费模型**: `glm-4-flash`
- **文档**: https://open.bigmodel.cn/dev/api