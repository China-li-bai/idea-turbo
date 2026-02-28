export interface TTSConfig {
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSProfile {
  name: string;
  description: string;
  config: TTSConfig;
}

export const TTS_PROFILES: Record<string, TTSProfile> = {
  audiobook: {
    name: '有声读物',
    description: '平稳舒缓的朗读风格，适合长时间收听',
    config: {
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0
    }
  },
  news: {
    name: '新闻播报',
    description: '清晰明快的播报风格，适合新闻资讯',
    config: {
      rate: 1.1,
      pitch: 1.05,
      volume: 1.05
    }
  },
  podcast: {
    name: '播客对话',
    description: '自然流畅的对话风格，适合播客内容',
    config: {
      rate: 0.95,
      pitch: 1.0,
      volume: 1.0
    }
  },
  accessibility: {
    name: '无障碍阅读',
    description: '清晰易读的辅助功能，适合视力障碍用户',
    config: {
      rate: 0.85,
      pitch: 1.0,
      volume: 1.0
    }
  },
  fast: {
    name: '快速浏览',
    description: '高速浏览模式，适合快速获取信息',
    config: {
      rate: 1.5,
      pitch: 1.0,
      volume: 1.0
    }
  },
  slow: {
    name: '慢速学习',
    description: '慢速学习模式，适合语言学习和深度理解',
    config: {
      rate: 0.6,
      pitch: 1.0,
      volume: 1.0
    }
  }
};

export function getTTSProfile(profileName: string): TTSConfig {
  const profile = TTS_PROFILES[profileName];
  return profile ? profile.config : TTS_PROFILES.audiobook.config;
}

export function getAllProfiles(): TTSProfile[] {
  return Object.values(TTS_PROFILES);
}
