import { RecognitionEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from './engine';

interface WebSpeechConfig extends RecognitionConfig {
  maxAlternatives: number;
  autoRestart: boolean;
}

export class WebSpeechEngine extends RecognitionEngine {
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private silenceTimer: number | null = null;
  private currentTranscript: string = '';
  private webSpeechConfig: WebSpeechConfig;

  constructor(config: RecognitionConfig, callbacks: RecognitionCallbacks) {
    super(config, callbacks);
    this.webSpeechConfig = {
      maxAlternatives: 1,
      autoRestart: true,
      ...config
    } as WebSpeechConfig;
  }

  async initialize(): Promise<void> {
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
      
      this.recognition.lang = this.webSpeechConfig.language;
      this.recognition.continuous = this.webSpeechConfig.continuous;
      this.recognition.interimResults = this.webSpeechConfig.interimResults;
      this.recognition.maxAlternatives = this.webSpeechConfig.maxAlternatives;

      this.recognition.onstart = () => {
        console.log('Web Speech API started');
        this.resetSilenceTimer();
      };

      this.recognition.onend = () => {
        console.log('Web Speech API ended');
        this.clearSilenceTimer();
        
        if (this.webSpeechConfig.autoRestart && this.getIsInitialized()) {
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

      this.setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Web Speech API:', error);
      this.emitError('Failed to initialize speech recognition');
    }
  }

  async start(): Promise<void> {
    if (!this.recognition) {
      this.emitError('语音识别未初始化');
      return;
    }

    try {
      if (this.webSpeechConfig.enableVolumeDetection) {
        await this.startVolumeDetection();
      }

      this.recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.emitError('启动语音识别失败');
    }
  }

  async stop(): Promise<void> {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    }

    this.stopVolumeDetection();
    this.clearSilenceTimer();
  }

  setLanguage(language: string): void {
    this.webSpeechConfig.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  updateConfig(config: Partial<RecognitionConfig>): void {
    this.webSpeechConfig = { ...this.webSpeechConfig, ...config } as WebSpeechConfig;
    
    if (this.recognition) {
      this.recognition.lang = this.webSpeechConfig.language;
      this.recognition.continuous = this.webSpeechConfig.continuous;
      this.recognition.interimResults = this.webSpeechConfig.interimResults;
      this.recognition.maxAlternatives = this.webSpeechConfig.maxAlternatives;
    }
  }

  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  clearTranscript(): void {
    this.currentTranscript = '';
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  destroy(): void {
    this.stop();
    this.recognition = null;
  }

  private handleResult(event: any): void {
    this.resetSilenceTimer();

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;

      if (result.isFinal) {
        finalTranscript += transcript;
        
        this.emitResult({
          transcript: transcript,
          confidence: confidence,
          isFinal: true,
          isInterim: false
        });
      } else {
        interimTranscript += transcript;
        
        if (this.webSpeechConfig.enableRealtimePreview) {
          this.emitResult({
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

  private handleError(event: any): void {
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
    this.emitError(errorMessage);
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    
    if (this.webSpeechConfig.silenceTimeout > 0) {
      this.silenceTimer = window.setTimeout(() => {
        console.log('Silence timeout, restarting recognition');
        if (this.recognition) {
          try {
            this.recognition.stop();
          } catch (error) {
            console.error('Failed to stop recognition on silence timeout:', error);
          }
        }
      }, this.webSpeechConfig.silenceTimeout);
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private async startVolumeDetection(): Promise<void> {
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
        
        this.emitVolumeChange(volume);
        
        this.animationFrameId = requestAnimationFrame(detectVolume);
      };

      detectVolume();
    } catch (error) {
      console.error('Failed to start volume detection:', error);
    }
  }

  private stopVolumeDetection(): void {
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
    this.emitVolumeChange(0);
  }

  getSupportedLanguages(): string[] {
    return [
      'zh-CN', 'zh-TW', 'en-US', 'en-GB', 
      'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 
      'es-ES', 'it-IT', 'pt-BR', 'ru-RU', 'ar-SA', 'hi-IN'
    ];
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
}
