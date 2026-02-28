interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface VoiceConversationState {
  messages: ConversationMessage[];
  isListening: boolean;
  isSpeaking: boolean;
}

interface RecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  autoRestart: boolean;
  silenceTimeout: number;
  minConfidence: number;
  enableVolumeDetection: boolean;
  enableRealtimePreview: boolean;
}

interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  isInterim: boolean;
}

interface VolumeLevel {
  level: number;
  timestamp: number;
}

export class VoiceConversationManager {
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private silenceTimer: number | null = null;
  private currentTranscript: string = '';
  private onResult: (result: RecognitionResult) => void;
  private onError: (error: string) => void;
  private onVolumeChange: (volume: number) => void;
  private config: RecognitionConfig;
  private isInitialized: boolean = false;

  constructor(options: {
    onResult: (result: RecognitionResult) => void;
    onError: (error: string) => void;
    onVolumeChange?: (volume: number) => void;
    config?: Partial<RecognitionConfig>;
  }) {
    this.onResult = options.onResult;
    this.onError = options.onError;
    this.onVolumeChange = options.onVolumeChange || (() => {});
    
    this.config = {
      language: 'zh-CN',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      autoRestart: true,
      silenceTimeout: 3000,
      minConfidence: 0.5,
      enableVolumeDetection: true,
      enableRealtimePreview: true,
      ...options.config
    };

    this.initRecognition();
  }

  private async initRecognition() {
    if (typeof window === 'undefined') {
      console.warn('Speech recognition not supported in this environment');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;

      this.recognition.onstart = () => {
        console.log('Speech recognition started');
        this.resetSilenceTimer();
      };

      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.clearSilenceTimer();
        
        if (this.config.autoRestart && this.isInitialized) {
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
            }
          }, 100);
        }
      };

      this.recognition.onresult = (event: any) => {
        this.handleResult(event);
      };

      this.recognition.onerror = (event: any) => {
        this.handleError(event);
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      this.onError('Failed to initialize speech recognition');
    }
  }

  private handleResult(event: any) {
    this.resetSilenceTimer();

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;

      if (result.isFinal) {
        finalTranscript += transcript;
        
        this.onResult({
          transcript: transcript,
          confidence: confidence,
          isFinal: true,
          isInterim: false
        });
      } else {
        interimTranscript += transcript;
        
        if (this.config.enableRealtimePreview) {
          this.onResult({
            transcript: transcript,
            confidence: confidence,
            isFinal: false,
            isInterim: true
          });
        }
      }
    }

    this.currentTranscript = finalTranscript + interimTranscript;
  }

  private handleError(event: any) {
    console.error('Speech recognition error:', event.error);
    
    const errorMessages: Record<string, string> = {
      'no-speech': '未检测到语音',
      'audio-capture': '无法访问麦克风',
      'not-allowed': '麦克风权限被拒绝',
      'network': '网络错误',
      'aborted': '识别被中止',
      'busy': '语音识别服务忙碌',
      'service-not-allowed': '语音识别服务不被允许'
    };

    const errorMessage = errorMessages[event.error] || `语音识别错误: ${event.error}`;
    this.onError(errorMessage);
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    
    if (this.config.silenceTimeout > 0) {
      this.silenceTimer = window.setTimeout(() => {
        console.log('Silence timeout, restarting recognition');
        if (this.recognition) {
          try {
            this.recognition.stop();
          } catch (error) {
            console.error('Failed to stop recognition on silence timeout:', error);
          }
        }
      }, this.config.silenceTimeout);
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  async start() {
    if (!this.recognition) {
      this.onError('语音识别未初始化');
      return;
    }

    try {
      if (this.config.enableVolumeDetection) {
        await this.startVolumeDetection();
      }

      this.recognition.start();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.onError('启动语音识别失败');
    }
  }

  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    }

    this.stopVolumeDetection();
    this.clearSilenceTimer();
    this.isInitialized = false;
  }

  async startVolumeDetection() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = stream;
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const detectVolume = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / bufferLength;
        const volume = Math.min(100, (average / 255) * 100);
        
        this.onVolumeChange(volume);
        
        this.animationFrameId = requestAnimationFrame(detectVolume);
      };

      detectVolume();
    } catch (error) {
      console.error('Failed to start volume detection:', error);
    }
  }

  stopVolumeDetection() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.microphone) {
      this.microphone.getTracks().forEach(track => track.stop());
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.onVolumeChange(0);
  }

  setLanguage(language: string) {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  updateConfig(newConfig: Partial<RecognitionConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }

  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  clearTranscript() {
    this.currentTranscript = '';
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  isListening(): boolean {
    return this.isInitialized;
  }

  getSupportedLanguages(): string[] {
    const languages = [
      { code: 'zh-CN', name: '中文（简体）' },
      { code: 'zh-TW', name: '中文（繁体）' },
      { code: 'en-US', name: '英语（美国）' },
      { code: 'en-GB', name: '英语（英国）' },
      { code: 'ja-JP', name: '日语' },
      { code: 'ko-KR', name: '韩语' },
      { code: 'fr-FR', name: '法语' },
      { code: 'de-DE', name: '德语' },
      { code: 'es-ES', name: '西班牙语' },
      { code: 'it-IT', name: '意大利语' },
      { code: 'pt-BR', name: '葡萄牙语（巴西）' },
      { code: 'ru-RU', name: '俄语' },
      { code: 'ar-SA', name: '阿拉伯语' },
      { code: 'hi-IN', name: '印地语' }
    ];
    
    return languages.map(lang => lang.code);
  }

  getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      'zh-CN': '中文（简体）',
      'zh-TW': '中文（繁体）',
      'en-US': '英语（美国）',
      'en-GB': '英语（英国）',
      'ja-JP': '日语',
      'ko-KR': '韩语',
      'fr-FR': '法语',
      'de-DE': '德语',
      'es-ES': '西班牙语',
      'it-IT': '意大利语',
      'pt-BR': '葡萄牙语（巴西）',
      'ru-RU': '俄语',
      'ar-SA': '阿拉伯语',
      'hi-IN': '印地语'
    };
    
    return languages[code] || code;
  }

  destroy() {
    this.stop();
    this.onResult = () => {};
    this.onError = () => {};
    this.onVolumeChange = () => {};
  }
}

export type { 
  ConversationMessage, 
  VoiceConversationState, 
  RecognitionConfig, 
  RecognitionResult,
  VolumeLevel
};
