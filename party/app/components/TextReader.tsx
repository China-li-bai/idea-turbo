import { useState, useRef, useEffect, useCallback } from 'react';
import type { TextSegment, TextParagraph, VoiceOption } from '../../party/types';
import { TextPreprocessor } from '../../party/modules/preprocessor';
import { TextSegmenter } from '../../party/modules/segmenter';
import { ParagraphSegmenter } from '../../party/modules/paragraph';
import { PlaybackController } from '../../party/modules/playback';
import { PlaybackControls } from './PlaybackControls';
import styles from './TextReader.module.css';

interface TextReaderProps {
  className?: string;
}

export function TextReader({ className }: TextReaderProps) {
  const [rawText, setRawText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [paragraphs, setParagraphs] = useState<TextParagraph[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackVolume, setPlaybackVolume] = useState(1);
  const [currentVoice, setCurrentVoice] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preprocessorRef = useRef<TextPreprocessor>(new TextPreprocessor());
  const segmenterRef = useRef<TextSegmenter>(new TextSegmenter());
  const paragraphSegmenterRef = useRef<ParagraphSegmenter>(new ParagraphSegmenter());
  const playbackRef = useRef<PlaybackController | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices.map(v => ({
        id: v.voiceURI || Math.random().toString(),
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        default: v.default,
      })));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    playbackRef.current = PlaybackController.create({
      defaultSpeed: playbackSpeed,
      defaultVolume: playbackVolume,
      autoPlay: false,
    });

    playbackRef.current.on('segmentStart', ({ segment }) => {
      setCurrentSegmentId(segment.id);
      scrollToSegment(segment.id);
    });

    playbackRef.current.on('play', () => {
      setIsPlaying(true);
      setIsPaused(false);
    });

    playbackRef.current.on('pause', () => {
      setIsPlaying(false);
      setIsPaused(true);
    });

    playbackRef.current.on('stop', () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSegmentId(0);
    });

    playbackRef.current.on('error', ({ error }) => {
      setError(error?.message || '播放错误');
    });

    playbackRef.current.on('complete', () => {
      setIsPlaying(false);
      setIsPaused(false);
    });

    return () => {
      playbackRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleStop();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, segments.length]);

  const togglePlayPause = useCallback(async () => {
    if (!playbackRef.current || segments.length === 0) return;

    try {
      if (isPlaying && !isPaused) {
        playbackRef.current.pause();
      } else if (!isPlaying && isPaused) {
        playbackRef.current.resume();
      } else {
        await playbackRef.current.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '播放失败');
    }
  }, [isPlaying, isPaused, segments.length]);

  const scrollToSegment = useCallback((segmentId: number) => {
    const element = document.getElementById(`segment-${segmentId}`);
    if (element && textContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const processText = useCallback((text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const preprocessor = preprocessorRef.current;
      const segmenter = segmenterRef.current;
      const paragraphSegmenter = paragraphSegmenterRef.current;

      const processed = preprocessor.process(text);
      setProcessedText(processed);

      const newSegments = segmenter.segment(processed);
      setSegments(newSegments);

      const doc = {
        id: 'temp',
        rawText: text,
        processedText: processed,
        segments: newSegments,
        paragraphs: [] as TextParagraph[],
        metadata: {
          totalChars: processed.length,
          totalSegments: newSegments.length,
          totalParagraphs: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const newParagraphs = paragraphSegmenter.segment(newSegments, doc);
      setParagraphs(newParagraphs);

      console.log('Text processed:', { segments: newSegments.length, paragraphs: newParagraphs.length });

      if (playbackRef.current) {
        playbackRef.current.setContent(newSegments, newParagraphs);
        console.log('Content set to playback controller');
      }

      setCurrentSegmentId(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文本处理失败');
      console.error('Text processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    processText(text);
  };

  const handlePlay = async () => {
    if (!playbackRef.current) {
      console.error('Playback controller not initialized');
      return;
    }

    if (segments.length === 0) {
      console.error('No segments to play');
      setError('没有可播放的内容');
      return;
    }

    console.log('Starting playback...', { segments: segments.length, currentSegmentId });

    try {
      await playbackRef.current.play();
      console.log('Playback started successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : '播放失败');
      console.error('Playback error:', err);
    }
  };

  const handlePause = () => {
    playbackRef.current?.pause();
  };

  const handleStop = () => {
    playbackRef.current?.stop();
    setCurrentSegmentId(0);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    playbackRef.current?.setSpeed(speed);
  };

  const handleVolumeChange = (volume: number) => {
    setPlaybackVolume(volume);
    playbackRef.current?.setVolume(volume);
  };

  const handleVoiceChange = (voiceURI: string) => {
    setCurrentVoice(voiceURI);
    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) {
      playbackRef.current?.setVoice(voice);
    }
  };

  const handleSeek = (segmentId: number) => {
    setCurrentSegmentId(segmentId);
    playbackRef.current?.seek(segmentId);
  };

  const handlePrevious = () => {
    if (currentSegmentId > 0) {
      handleSeek(currentSegmentId - 1);
    }
  };

  const handleNext = () => {
    if (currentSegmentId < segments.length - 1) {
      handleSeek(currentSegmentId + 1);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (segments.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const segmentId = Math.floor(percentage * segments.length);
    handleSeek(Math.min(segmentId, segments.length - 1));
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>文本阅读器</h2>
        <div className={styles.stats}>
          {segments.length > 0 && (
            <>
              <span>{segments.length} 句</span>
              <span className={styles.divider}>|</span>
              <span>{paragraphs.length} 段</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          ⚠️ {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className={styles.inputSection}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textarea}
            placeholder="在这里粘贴或输入文本..."
            value={rawText}
            onChange={handleTextChange}
            rows={6}
          />
          <button
            className={`${styles.playButton} ${styles.mainPlayButton}`}
            onClick={handlePlay}
            disabled={segments.length === 0 || isProcessing}
            title="播放 (空格)"
          >
            {isProcessing ? '处理中...' : '▶ 播放'}
          </button>
        </div>
      </div>

      <div className={styles.controlPanel}>
        <div className={styles.progressSection}>
          <div
            className={styles.progressBar}
            onClick={handleProgressClick}
            role="slider"
            aria-label="播放进度"
            aria-valuenow={segments.length > 0 ? Math.round(((currentSegmentId + 1) / segments.length) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${segments.length > 0 ? ((currentSegmentId + 1) / segments.length) * 100 : 0}%` }}
            />
          </div>
          <div className={styles.progressInfo}>
            <span>{segments.length > 0 ? `${currentSegmentId + 1} / ${segments.length}` : '0 / 0'}</span>
            <span>{segments.length > 0 ? Math.round(((currentSegmentId + 1) / segments.length) * 100) : 0}%</span>
          </div>
        </div>

        <div className={styles.mainControls}>
          <button
            className={styles.controlButton}
            onClick={handlePrevious}
            disabled={currentSegmentId === 0}
            title="上一句 (←)"
          >
            ⏮
          </button>

          <button
            className={`${styles.controlButton} ${styles.playControlButton}`}
            onClick={isPlaying && !isPaused ? handlePause : handlePlay}
            disabled={segments.length === 0}
            title={isPlaying && !isPaused ? '暂停 (空格)' : '播放 (空格)'}
          >
            {isPlaying && !isPaused ? '⏸' : '▶'}
          </button>

          <button
            className={styles.controlButton}
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            title="停止 (S)"
          >
            ⏹
          </button>

          <button
            className={styles.controlButton}
            onClick={handleNext}
            disabled={currentSegmentId >= segments.length - 1}
            title="下一句 (→)"
          >
            ⏭
          </button>
        </div>

        <div className={styles.secondaryControls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>语速</label>
            <div className={styles.speedButtons}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3].map(speed => (
                <button
                  key={speed}
                  className={`${styles.speedButton} ${playbackSpeed === speed ? styles.active : ''}`}
                  onClick={() => handleSpeedChange(speed)}
                  title={`${speed}x 速度`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>音量</label>
            <input
              type="range"
              className={styles.volumeSlider}
              min="0"
              max="1"
              step="0.1"
              value={playbackVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              aria-label="音量"
            />
            <span className={styles.volumeValue}>{Math.round(playbackVolume * 100)}%</span>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>语音</label>
            <select
              className={styles.voiceSelect}
              value={currentVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              aria-label="选择语音"
            >
              <option value="">默认语音</option>
              {availableVoices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className={styles.processing}>
          <span className={styles.spinner}></span>
          正在处理文本...
        </div>
      )}

      {segments.length > 0 && (
        <div className={styles.textContainer} ref={textContainerRef}>
            {paragraphs.map((paragraph) => {
              const paragraphSegments = segments.filter(
                s => s.paragraphId === paragraph.id
              );

              return (
                <div key={paragraph.id} className={styles.paragraph}>
                  {paragraphSegments.map((segment) => (
                    <span
                      key={segment.id}
                      id={`segment-${segment.id}`}
                      className={`${styles.segment} ${currentSegmentId === segment.id ? styles.current : ''}`}
                      onClick={() => handleSeek(segment.id)}
                    >
                      {segment.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
      )}

      {segments.length === 0 && rawText && !isProcessing && (
        <div className={styles.empty}>
          <p>请输入文本后点击播放</p>
          <p className={styles.hint}>快捷键: 空格(播放/暂停) | S(停止) | ←(上一句) | →(下一句)</p>
        </div>
      )}
    </div>
  );
}
