/**
 * brain-trust + 智谱 GLM 使用示例
 * 
 * 运行方式:
 *   npx tsx demos/glm-demo.ts
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAgent, createCrew, wisdomTeam } from '../src/index.js';

const ZHIPU_API_KEY = 'ded4807896d047eabb018a85731866db.Lb6SDKLfX3r412lG';

const zhipu = createOpenAICompatible({
  name: 'zhipu',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  apiKey: ZHIPU_API_KEY,
});

async function main() {
  console.log('🧠 智囊团 (Brain Trust) - 智谱 GLM Demo\n');
  console.log('=' .repeat(50));
  console.log('模型: GLM-4.5-Flash / GLM-4-Flash');
  console.log('提供商: 智谱 AI (Zhipu/GLM)');
  console.log('模式: 并行 (Parallel)');
  console.log('=' .repeat(50) + '\n');

  const crew = createCrew({
    agents: [
      createAgent({
        ...wisdomTeam.jobs,
        model: zhipu('glm-4.5-flash'),
      }),
      createAgent({
        ...wisdomTeam.musk,
        model: zhipu('glm-4.5-flash'),
      }),
      createAgent({
        ...wisdomTeam.sunzi,
        model: zhipu('glm-4.5-flash'),
      }),
      createAgent({
        ...wisdomTeam.laotzu,
        model: zhipu('glm-4.5-flash'),
      }),
    ],
    mode: 'parallel',
  });

  const question = '如何打造一个伟大的产品？请用简短的语言回答。';

  console.log(`❓ 问题: ${question}\n`);

  for await (const event of crew.run(question)) {
    switch (event.type) {
      case 'crew_start':
        console.log('🚀 智囊团开始讨论...\n');
        break;

      case 'agent_start':
        console.log(`${'─'.repeat(40)}`);
        console.log(`${event.agent.emoji} ${event.agent.name} (${event.agent.role}):`);
        console.log(''.padEnd(40));
        break;

      case 'agent_chunk':
        process.stdout.write(event.text);
        break;

      case 'agent_done':
        console.log('\n');
        break;

      case 'crew_done':
        console.log(`\n${'═'.repeat(50)}`);
        console.log('✅ 所有专家已发表意见完毕！');
        console.log('═'.repeat(50) + '\n');
        break;
    }
  }
}

main().catch(console.error);
