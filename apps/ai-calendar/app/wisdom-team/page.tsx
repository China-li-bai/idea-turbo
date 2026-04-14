'use client';

import { useState, useCallback } from 'react';
import { WisdomTeamBoard } from '@idea-turbo/wisdom-ui';
import '@idea-turbo/wisdom-ui/styles.css';
import { createAgent, createCrew, wisdomTeam, type Agent } from '@idea-turbo/brain-trust';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

type ProviderType = 'glm' | 'siliconflow';

interface ProviderConfig {
  name: string;
  baseURL: string;
  defaultModel: string;
  models: string[];
}

const providers: Record<ProviderType, ProviderConfig> = {
  glm: {
    name: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4.5-flash', 'glm-4-plus'],
  },
  siliconflow: {
    name: 'SiliconFlow',
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Pro/deepseek-ai/DeepSeek-V3.2',
    models: [
      'Pro/deepseek-ai/DeepSeek-V3.2',
      'Pro/zai-org/GLM-4.7',
      'deepseek-ai/DeepSeek-V3',
    ],
  },
};

export default function WisdomTeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string>();
  const [streamingText, setStreamingText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('如何打造一个伟大的产品？');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [providerType, setProviderType] = useState<ProviderType>('siliconflow');
  const [apiKey, setApiKey] = useState('sk-wlnndkbwvldqiqkegktepmxvpoxgjovomtjzedptouxbzdyf');
  const [model, setModel] = useState('Pro/deepseek-ai/DeepSeek-V3.2');
  const [showConfig, setShowConfig] = useState(true);

  const initAgents = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    try {
      setError(null);
      const provider = providers[providerType];

      const client = createOpenAICompatible({
        name: providerType,
        baseURL: provider.baseURL,
        apiKey: apiKey,
      });

      const crew = createCrew({
        agents: [
          createAgent({ ...wisdomTeam.jobs, model: client(model) }),
          createAgent({ ...wisdomTeam.musk, model: client(model) }),
          createAgent({ ...wisdomTeam.sunzi, model: client(model) }),
          createAgent({ ...wisdomTeam.confucius, model: client(model) }),
        ],
        mode: 'parallel',
      });

      setAgents([...crew.agentsList]);
      setInitialized(true);
      setShowConfig(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败');
    }
  }, [apiKey, model, providerType]);

  const askQuestion = useCallback(async () => {
    if (!agents.length || loading) return;

    setLoading(true);
    setStreamingText({});
    setActiveAgentId(undefined);
    setError(null);

    try {
      const crew = createCrew({ agents, mode: 'parallel' });

      for await (const event of crew.run(question)) {
        switch (event.type) {
          case 'agent_start':
            setActiveAgentId(event.agent.id);
            setStreamingText(prev => ({ ...prev, [event.agent.id]: '' }));
            break;
          case 'agent_chunk':
            setStreamingText(prev => ({
              ...prev,
              [event.agent.id]: (prev[event.agent.id] || '') + event.text,
            }));
            break;
          case 'agent_done':
            break;
          case 'crew_done':
            setActiveAgentId(undefined);
            setLoading(false);
            break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
      setLoading(false);
    }
  }, [agents, question, loading]);

  const handleProviderChange = (type: ProviderType) => {
    setProviderType(type);
    setModel(providers[type].defaultModel);
  };

  return (
    <div className="min-h-screen bg-[#0F0F13]">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          智囊团测试页面
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Brain Trust + Wisdom UI 集成演示
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {showConfig && (
          <div className="bg-[#1A1A24] border border-[#3A3A4D] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">API 配置</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">提供商</label>
                <div className="flex gap-4">
                  {(Object.keys(providers) as ProviderType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleProviderChange(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        providerType === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#252533] text-gray-400 hover:bg-[#3A3A4D]'
                      }`}
                    >
                      {providers[type].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入 API Key..."
                  className="w-full px-4 py-2 bg-[#252533] border border-[#3A3A4D] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">模型</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-2 bg-[#252533] border border-[#3A3A4D] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {providers[providerType].models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={initAgents}
                disabled={!apiKey.trim()}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                初始化智囊团
              </button>
            </div>
          </div>
        )}

        {initialized && (
          <>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="输入问题..."
                className="flex-1 px-4 py-2 bg-[#1A1A24] border border-[#3A3A4D] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={askQuestion}
                disabled={loading || !question.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? '思考中...' : '提问'}
              </button>
            </div>

            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-500 text-sm">
                已加载 {agents.length} 位智囊团成员 | {providers[providerType].name} / {model}
              </p>
              <button
                onClick={() => {
                  setInitialized(false);
                  setShowConfig(true);
                  setAgents([]);
                }}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                重新配置
              </button>
            </div>

            <WisdomTeamBoard
              agents={agents}
              activeAgentId={activeAgentId}
              streamingText={streamingText}
              onCharacterClick={(agent) => {
                console.log('Clicked:', agent.name);
              }}
            />

            {loading && (
              <div className="text-center mt-6">
                <p className="text-gray-400 text-sm animate-pulse">
                  智囊团正在讨论中...
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-12 border-t border-[#3A3A4D] pt-6">
          <h2 className="text-lg font-semibold text-white mb-4">使用说明</h2>
          <div className="text-gray-400 text-sm space-y-2">
            <p>1. 选择提供商并输入 API Key</p>
            <p>2. 点击「初始化智囊团」创建 Agent 实例</p>
            <p>3. 输入问题，点击「提问」</p>
            <p>4. 观察角色动画和流式文本输出</p>
            <p>5. 鼠标悬停/点击角色查看交互效果</p>
          </div>
        </div>
      </div>
    </div>
  );
}
