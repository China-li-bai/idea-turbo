'use client';

import { PlaybackState } from '../lib/playbackState';
import { useI18n } from '../lib/i18n/context';

interface PlaybackControlSectionProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function PlaybackControlSection({
  playbackState,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrevious
}: PlaybackControlSectionProps) {
  const { t } = useI18n();
  const { isPlaying, isPaused, segments, currentSegmentId } = playbackState;

  const canPlay = !isPlaying || isPaused;
  const canPause = isPlaying && !isPaused;
  const canStop = isPlaying;
  const canPrevious = currentSegmentId !== null && currentSegmentId > 0;
  const canNext = currentSegmentId !== null && currentSegmentId < segments.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevious}
          disabled={!canPrevious}
          className="px-4 py-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50"
        >
          {t.controls.previousSegment}
        </button>
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPaused ? t.common.continue : t.controls.play}
        </button>
        <button
          onClick={onPause}
          disabled={!canPause}
          className="px-4 py-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50"
        >
          {t.controls.pause}
        </button>
        <button
          onClick={onStop}
          disabled={!canStop}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.controls.stop}
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-4 py-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50"
        >
          {t.controls.nextSegment}
        </button>
      </div>

      {currentSegmentId !== null && (
        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {t.page.currentSegment} {currentSegmentId + 1} / {segments.length} {t.page.totalSegments}
        </div>
      )}
    </div>
  );
}
