export interface VoiceInputState {
  isReady: boolean;
  isRecording: boolean;
  isInitializing: boolean;
  error: string | null;
  volume: number;
  initProgress: number;
  initStatus: string;
}

export interface TranscriptState {
  segments: string[];
  currentSegment: string;
  fullText: string;
}

export interface VoiceInputConfig {
  language?: 'zh-CN' | 'en-US';
  continuous?: boolean;
  interimResults?: boolean;
  silenceTimeout?: number;
  minConfidence?: number;
  enableVolumeDetection?: boolean;
  autoInitialize?: boolean;
}

export interface VoiceInputCallbacks {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onReady?: () => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}

export interface UseVoiceRecognitionOptions extends VoiceInputConfig, VoiceInputCallbacks {}

export interface VoiceInputProps extends UseVoiceRecognitionOptions {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface WeChatVoiceInputProps extends VoiceInputProps {
  showProgress?: boolean;
  showDiagnostics?: boolean;
  placeholder?: string;
}

export interface DiagnosticsResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}
