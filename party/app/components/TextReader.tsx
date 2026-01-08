import { useState, useEffect, useCallback, useRef } from 'react';
import { useTextReader } from '../hooks/useTextReader';
import { PlaybackControls } from './PlaybackControls';
import styles from './TextReader.module.css';

interface TextReaderProps {
  className?: string;
  room: string;
}

interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export function TextReader({ className, room }: TextReaderProps) {
  const {
    rawText,
    segments,
    paragraphs,
    currentSegmentId,
    isProcessing,
    error,
    syncStatus,
    playbackController,
    setText,
    setCurrentSegmentId,
  } = useTextReader({ room });

  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [textareaValue, setTextareaValue] = useState('');

  useEffect(() => {
    setTextareaValue(rawText);
  }, [rawText]);

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
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaValue(e.target.value);
    setText(e.target.value);
  }, [setText]);

  const handleSeek = useCallback((segmentId: number) => {
    setCurrentSegmentId(segmentId);
    playbackController?.seek(segmentId);
  }, [playbackController, setCurrentSegmentId]);

  const handlePlay = useCallback(async () => {
    if (!playbackController || segments.length === 0) return;
    await playbackController.play();
  }, [playbackController, segments.length]);

  const handlePause = useCallback(() => {
    playbackController?.pause();
  }, [playbackController]);

  const handleStop = useCallback(() => {
    playbackController?.stop();
    setCurrentSegmentId(0);
  }, [playbackController, setCurrentSegmentId]);

  const handlePrevious = useCallback(() => {
    if (currentSegmentId > 0) {
      handleSeek(currentSegmentId - 1);
    }
  }, [currentSegmentId, handleSeek]);

  const handleNext = useCallback(() => {
    if (currentSegmentId < segments.length - 1) {
      handleSeek(currentSegmentId + 1);
    }
  }, [currentSegmentId, segments.length, handleSeek]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (playbackController?.isPlaying && !playbackController.isPaused) {
          handlePause();
        } else {
          handlePlay();
        }
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
  }, [playbackController, handlePlay, handlePause, handleStop, handlePrevious, handleNext]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>文本阅读器</h2>
        <div className={styles.stats}>
          <span className={`${styles.statusIndicator} ${styles[syncStatus]}`}>
            {syncStatus === "synced" && "✓ 已同步"}
            {syncStatus === "syncing" && "⟳ 同步中..."}
            {syncStatus === "offline" && "⚠ 离线模式"}
          </span>
          {segments.length > 0 && (
            <>
              <span className={styles.divider}>|</span>
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
          <button className={styles.errorClose} onClick={() => {}}>×</button>
        </div>
      )}

      <div className={styles.inputSection}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textarea}
            placeholder="在这里粘贴或输入文本..."
            value={textareaValue}
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
        <PlaybackControls
          playbackController={playbackController}
          availableVoices={availableVoices}
          onSeek={handleSeek}
        />
      </div>

      {isProcessing && (
        <div className={styles.processing}>
          <span className={styles.spinner}></span>
          正在处理文本...
        </div>
      )}

      {segments.length > 0 && (
        <div className={styles.textContainer}>
          {paragraphs.map((paragraph) => (
            <div key={paragraph.id} className={styles.paragraph}>
              {segments
                .filter(s => s.paragraphId === paragraph.id)
                .map((segment) => (
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
          ))}
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
