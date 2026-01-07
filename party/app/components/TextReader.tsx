import { useState, useRef, useEffect, useCallback } from 'react';
import type { TextSegment, TextParagraph, VoiceOption } from '../../party/types';
import { TextPreprocessor } from '../../party/modules/preprocessor';
import { TextSegmenter } from '../../party/modules/segmenter';
import { ParagraphSegmenter } from '../../party/modules/paragraph';
import { PlaybackController } from '../../party/modules/playback';
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
  const [isPlaying, setIsPlaying] = useState(false);
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
      autoPlay: false,
    });

    playbackRef.current.on('segmentStart', ({ segment }) => {
      setCurrentSegmentId(segment.id);
      scrollToSegment(segment.id);
    });

    playbackRef.current.on('play', () => setIsPlaying(true));
    playbackRef.current.on('pause', () => setIsPlaying(false));
    playbackRef.current.on('stop', () => {
      setIsPlaying(false);
      setCurrentSegmentId(0);
    });
    playbackRef.current.on('error', ({ error }) => {
      setError(error?.message || '播放错误');
    });

    return () => {
      playbackRef.current?.destroy();
    };
  }, []);

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

      if (playbackRef.current) {
        playbackRef.current.setContent(newSegments, newParagraphs);
      }

      setCurrentSegmentId(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文本处理失败');
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
    if (!playbackRef.current) return;

    try {
      if (isPlaying) {
        playbackRef.current.pause();
      } else {
        await playbackRef.current.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '播放失败');
    }
  };

  const handleStop = () => {
    playbackRef.current?.stop();
    setCurrentSegmentId(0);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    playbackRef.current?.setSpeed(speed);
  };

  const handleVoiceChange = (voiceURI: string) => {
    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) {
      playbackRef.current?.setVoice(voice);
    }
  };

  const handleSeek = (segmentId: number) => {
    setCurrentSegmentId(segmentId);
    playbackRef.current?.seek(segmentId);
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
        </div>
      )}

      <div className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder="在这里粘贴或输入文本..."
          value={rawText}
          onChange={handleTextChange}
          rows={6}
        />
      </div>

      {isProcessing && (
        <div className={styles.processing}>
          <span className={styles.spinner}></span>
          正在处理文本...
        </div>
      )}

      {segments.length > 0 && (
        <>
          <div className={styles.controls}>
            <div className={styles.playbackControls}>
              <button
                className={styles.button}
                onClick={handlePlay}
                disabled={segments.length === 0}
              >
                {isPlaying ? '⏸ 暂停' : '▶ 播放'}
              </button>
              <button
                className={styles.button}
                onClick={handleStop}
                disabled={!isPlaying}
              >
                ⏹ 停止
              </button>
            </div>

            <div className={styles.speedControl}>
              <label>语速:</label>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  className={`${styles.speedButton} ${playbackSpeed === speed ? styles.active : ''}`}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div className={styles.voiceControl}>
              <label>语音:</label>
              <select
                className={styles.select}
                onChange={(e) => handleVoiceChange(e.target.value)}
                defaultValue=""
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
        </>
      )}

      {segments.length === 0 && rawText && !isProcessing && (
        <div className={styles.empty}>
          <p>请输入文本后点击播放</p>
        </div>
      )}
    </div>
  );
}
