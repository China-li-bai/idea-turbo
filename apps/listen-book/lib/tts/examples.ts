/**
 * TTS API 使用示例
 * 演示如何使用设备 ID 进行速率限制
 */

import TTSClient, { TTSRateLimitError } from './TTSClient';

const ttsClient = new TTSClient('https://shu.66666618.xyz');

async function example1_BasicUsage() {
  try {
    const audioBlob = await ttsClient.generateSpeech({
      input: '你好，这是一个测试。',
      voice: 'shimmer'
    }) as Blob;

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    console.log('语音生成成功');
  } catch (error) {
    if (error instanceof TTSRateLimitError) {
      console.error('速率限制错误:', error.message);
      console.log('重置时间:', error.getResetTime());
      console.log('重试等待秒数:', error.getRetryAfterSeconds());
    } else {
      console.error('错误:', error);
    }
  }
}

async function example2_StreamingAudio() {
  try {
    const response = await ttsClient.generateSpeech({
      input: '这是一个流式音频的示例。',
      voice: 'shimmer',
      stream: true
    }) as Response;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const audioChunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      audioChunks.push(value);
    }

    const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    console.log('流式音频开始播放');
  } catch (error) {
    console.error('流式音频错误:', error);
  }
}

async function example3_HandleRateLimit() {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const audioBlob = await ttsClient.generateSpeech({
        input: '测试速率限制处理。',
        voice: 'shimmer'
      });

      console.log('请求成功');
      break;

    } catch (error) {
      if (error instanceof TTSRateLimitError) {
        retryCount++;
        const retryAfter = error.getRetryAfterSeconds();

        if (retryAfter && retryCount < maxRetries) {
          console.log(`速率限制，等待 ${retryAfter} 秒后重试 (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }

      console.error('请求失败:', error);
      break;
    }
  }
}

async function example4_GetAvailableVoices() {
  try {
    const voices = await ttsClient.getVoices();
    console.log('可用语音列表:', voices.data);
    
    const chineseVoices = voices.data.filter((voice: any) => 
      voice.locale.startsWith('zh-')
    );
    console.log('中文语音:', chineseVoices);
  } catch (error) {
    console.error('获取语音列表失败:', error);
  }
}

async function example5_BatchRequests() {
  const texts = [
    '第一段文本。',
    '第二段文本。',
    '第三段文本。'
  ];

  try {
    const promises = texts.map(text => 
      ttsClient.generateSpeech({ input: text, voice: 'shimmer' })
    );

    const audioBlobs = await Promise.all(promises);
    console.log(`成功生成 ${audioBlobs.length} 段语音`);

    audioBlobs.forEach((blob, index) => {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    });

  } catch (error) {
    if (error instanceof TTSRateLimitError) {
      console.error('批量请求达到速率限制');
      console.log('建议：减少并发请求数或增加请求间隔');
    } else {
      console.error('批量请求失败:', error);
    }
  }
}

async function example6_AdvancedParameters() {
  try {
    const audioBlob = await ttsClient.generateSpeech({
      input: '这是一个高级参数示例。',
      voice: 'shimmer',
      speed: 1.2,
      pitch: 1.1
    });

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    console.log('高级参数语音生成成功');
  } catch (error) {
    console.error('错误:', error);
  }
}

export {
  example1_BasicUsage,
  example2_StreamingAudio,
  example3_HandleRateLimit,
  example4_GetAvailableVoices,
  example5_BatchRequests,
  example6_AdvancedParameters
};

console.log('TTS API 使用示例已加载');
console.log('设备 ID:', localStorage.getItem('device_id'));