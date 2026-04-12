'use client';

import { WeChatVoiceInput } from '@idea-turbo/voice-input';
import '@idea-turbo/voice-input/styles.css';

export default function VoiceInputDemo() {
  return (
    <WeChatVoiceInput
      language="zh-CN"
      autoInitialize={true}
      showProgress={true}
      placeholder="按住下方按钮开始说话"
      onResult={(text, isFinal) => {
        console.log('识别结果:', text, isFinal ? '(最终)' : '(临时)');
      }}
      onError={(error) => {
        console.error('错误:', error);
      }}
      onReady={() => {
        console.log('语音引擎已就绪');
      }}
    />
  );
}
