import { useState, useEffect, useCallback, useRef } from 'react';
import type { VoiceOption } from '../../party/types';
import { PlaybackController } from '../../party/modules/playback';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  playbackController: PlaybackController | null;
  availableVoices: VoiceOption[];
  onSeek?: (segmentId: number) => void;
  className?: string;
}

export function PlaybackControls({
  playbackController,
  availableVoices,
  onSeek,
  className,
}: PlaybackControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackVolume, setPlaybackVolume] = useState(1);
  const progressRef = useRef<HTMLDivElement>(null);

  const totalSegments = playbackController?.getSegments().length || 0;
  const progress = totalSegments > 0 ? ((currentSegmentId + 1) / totalSegments) * 100 : 0;

  useEffect(() => {
    if (!playbackController) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setIsPaused(true);
    };
    const handleStop = ({ segmentId: lastSegmentId }: { segmentId: number }) => {
      setIsPlaying(false);
      setIsPaused(false);
      if (lastSegmentId === 0) {
        setCurrentSegmentId(0);
      }
    };
    const handleSeek = ({ segmentId }: { segmentId: number }) => {
      onSeek?.(segmentId);
    };
    const handleComplete = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    const handleSegmentStart = ({ segment }: { segment: any }) => {
      setCurrentSegmentId(segment.id);
    };
    const handleSegmentComplete = ({ segmentId }: { segmentId: number }) => {
      setCurrentSegmentId(segmentId + 1);
    };

    const unsubscribers = [
      playbackController.on('play', handlePlay),
      playbackController.on('pause', handlePause),
      playbackController.on('stop', handleStop),
      playbackController.on('seek', handleSeek),
      playbackController.on('complete', handleComplete),
      playbackController.on('segmentStart', handleSegmentStart),
      playbackController.on('segmentComplete', handleSegmentComplete),
    ];

    setPlaybackSpeed(playbackController.speed);
    setPlaybackVolume(playbackController.volume);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [playbackController]);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const handlePlay = useCallback(() => {
    playbackController?.play();
  }, [playbackController]);

  const handlePause = useCallback(() => {
    playbackController?.pause();
  }, [playbackController]);

  const handleStop = useCallback(() => {
    playbackController?.stop();
  }, [playbackController]);

  const handlePrevious = useCallback(() => {
    if (currentSegmentId > 0) {
      playbackController?.seek(currentSegmentId - 1);
    }
  }, [currentSegmentId, playbackController]);

  const handleNext = useCallback(() => {
    if (currentSegmentId < totalSegments - 1) {
      playbackController?.seek(currentSegmentId + 1);
    }
  }, [currentSegmentId, totalSegments, playbackController]);

  const handleSpeedChange = useCallback((speed: number) => {
    playbackController?.setSpeed(speed);
    setPlaybackSpeed(speed);
  }, [playbackController]);

  const handleVolumeChange = useCallback((volume: number) => {
    playbackController?.setVolume(volume);
    setPlaybackVolume(volume);
  }, [playbackController]);

  const handleVoiceChange = useCallback((voiceURI: string) => {
    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) {
      playbackController?.setVoice(voice);
    }
  }, [playbackController]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalSegments === 0) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const segmentId = Math.floor(percentage * totalSegments);
    const targetId = Math.min(segmentId, totalSegments - 1);
    playbackController?.seek(targetId);
    onSeek?.(targetId);
  }, [totalSegments, playbackController, onSeek]);

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
      const targetId = Math.min(segmentId, totalSegments - 1);
      playbackController?.seek(targetId);
      onSeek?.(targetId);
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [totalSegments, playbackController, onSeek]);

  const handleSeekByKeyboard = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  }, [handlePrevious, handleNext]);

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
            onClick={handlePrevious}
            disabled={currentSegmentId === 0}
            title="上一句 (←)"
          >
            ⏮
          </button>

          <button
            className={`${styles.button} ${styles.playButton}`}
            onClick={isPlaying && !isPaused ? handlePause : handlePlay}
            title={isPlaying && !isPaused ? '暂停 (空格)' : '播放 (空格)'}
          >
            {isPlaying && !isPaused ? '⏸' : '▶'}
          </button>

          <button
            className={styles.button}
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            title="停止"
          >
            ⏹
          </button>

          <button
            className={styles.button}
            onClick={handleNext}
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
                  onClick={() => handleSpeedChange(speed)}
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
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              aria-label="音量"
            />
            <span className={styles.volumeValue}>{Math.round(playbackVolume * 100)}%</span>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>语音</label>
            <select
              className={styles.voiceSelect}
              value={playbackController?.voice?.voiceURI || ''}
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
    </div>
  );
}
