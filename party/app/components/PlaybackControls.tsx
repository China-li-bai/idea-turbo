import { useState, useEffect, useCallback, useRef } from 'react';
import type { VoiceOption } from '../../party/types';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentId: number;
  totalSegments: number;
  availableVoices: VoiceOption[];
  playbackSpeed: number;
  playbackVolume: number;
  currentVoice: string;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onVoiceChange: (voiceURI: string) => void;
  onSeek: (segmentId: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function PlaybackControls({
  isPlaying,
  isPaused,
  currentSegmentId,
  totalSegments,
  availableVoices,
  playbackSpeed,
  playbackVolume,
  currentVoice,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onVolumeChange,
  onVoiceChange,
  onSeek,
  onPrevious,
  onNext,
  className,
}: PlaybackControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = totalSegments > 0 ? ((currentSegmentId + 1) / totalSegments) * 100 : 0;
console.log({totalSegments,progress});

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalSegments === 0) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const segmentId = Math.floor(percentage * totalSegments);
    onSeek(Math.min(segmentId, totalSegments - 1));
  }, [totalSegments, onSeek]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      setLocalProgress(percentage * 100);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!progressRef.current || totalSegments === 0) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = upEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const segmentId = Math.floor(percentage * totalSegments);
      onSeek(Math.min(segmentId, totalSegments - 1));
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [totalSegments, onSeek]);

  const handleSeekByKeyboard = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onPrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNext();
    }
  }, [onPrevious, onNext]);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

  return (
    <div className={`${styles.container} ${className || ''}`} onKeyDown={handleSeekByKeyboard} tabIndex={0}>
      <div
        ref={progressRef}
        className={styles.progressBar}
        onClick={handleProgressClick}
        onMouseDown={handleProgressMouseDown}
        role="slider"
        aria-label="播放进度"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${localProgress}%` }}
        />
        {totalSegments > 0 && (
          <div
            className={styles.progressThumb}
            style={{ left: `${localProgress}%` }}
          />
        )}
      </div>

      <div className={styles.progressInfo}>
        <span>{currentSegmentId + 1} / {totalSegments}</span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div className={styles.controls}>
        <div className={styles.mainControls}>
          <button
            className={styles.button}
            onClick={onPrevious}
            disabled={currentSegmentId === 0}
            title="上一句 (←)"
          >
            ⏮
          </button>

          <button
            className={`${styles.button} ${styles.playButton}`}
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
          >
            {isPlaying && !isPaused ? '⏸' : '▶'}
          </button>

          <button
            className={styles.button}
            onClick={onStop}
            disabled={!isPlaying && !isPaused}
            title="停止"
          >
            ⏹
          </button>

          <button
            className={styles.button}
            onClick={onNext}
            disabled={currentSegmentId >= totalSegments - 1}
            title="下一句 (→)"
          >
            ⏭
          </button>
        </div>

        <div className={styles.secondaryControls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>语速</label>
            <div className={styles.speedButtons}>
              {speedOptions.map(speed => (
                <button
                  key={speed}
                  className={`${styles.speedButton} ${playbackSpeed === speed ? styles.active : ''}`}
                  onClick={() => onSpeedChange(speed)}
                  title={`${speed}x 速度`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>音量</label>
            <input
              type="range"
              className={styles.volumeSlider}
              min="0"
              max="1"
              step="0.1"
              value={playbackVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="音量"
            />
            <span className={styles.volumeValue}>{Math.round(playbackVolume * 100)}%</span>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>语音</label>
            <select
              className={styles.voiceSelect}
              value={currentVoice}
              onChange={(e) => onVoiceChange(e.target.value)}
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
    </div>
  );
}
