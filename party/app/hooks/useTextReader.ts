import { useEffect, useRef, useState, useCallback } from 'react';
import useYProvider from 'y-partykit/react';
import { IndexeddbPersistence } from 'y-indexeddb';
import { PlaybackController } from '../../party/modules/playback';

interface UseTextReaderOptions {
  room: string;
  defaultSpeed?: number;
  defaultVolume?: number;
}

interface UseTextReaderReturn {
  rawText: string;
  currentSegmentId: number;
  isProcessing: boolean;
  error: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline';
  playbackController: PlaybackController | null;
  setText: (text: string) => void;
  setCurrentSegmentId: (id: number) => void;
}

export function useTextReader({
  room,
  defaultSpeed = 1,
  defaultVolume = 1,
}: UseTextReaderOptions): UseTextReaderReturn {
  const [rawText, setRawText] = useState('');
  const [currentSegmentId, setCurrentSegmentId] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');

  const playbackRef = useRef<PlaybackController | null>(null);
  const idbPersistence = useRef<IndexeddbPersistence | null>(null);
  const isProcessingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const currentSegmentIdRef = useRef(0);

  const provider = useYProvider({ room });

  const handleSeek = useCallback((segmentId: number) => {
    currentSegmentIdRef.current = segmentId;
    setCurrentSegmentId(segmentId);
  }, []);

  useEffect(() => {
    const ytext = provider.doc.getText('rawText');
    const yplaybackState = provider.doc.getMap('playbackState');

    playbackRef.current = PlaybackController.create({
      defaultSpeed,
      defaultVolume,
      autoPlay: false,
    });

    const cleanupSeek = playbackRef.current.on('seek', ({ segmentId }) => {
      handleSeek(segmentId);
      yplaybackState.set('currentSegmentId', segmentId);
      yplaybackState.set('updatedAt', Date.now());
    });

    const cleanupSegmentStart = playbackRef.current.on('segmentStart', ({ segment }) => {
      handleSeek(segment.id);
    });

    const cleanupError = playbackRef.current.on('error', ({ error: err }) => {
      setError(err?.message || '播放错误');
    });

    idbPersistence.current = new IndexeddbPersistence(`textreader-${room}`, provider.doc);

    idbPersistence.current.on('synced', () => {
      console.log('IndexedDB synced!');
      setSyncStatus('synced');
      const savedText = ytext.toString();
      const savedSegmentId = yplaybackState.get('currentSegmentId') as number | undefined;

      console.log('From IndexedDB - savedText:', savedText?.substring(0, 50));
      setRawText(savedText);

      if (savedText && savedText.trim().length > 0) {
        isProcessingRef.current = true;
        setIsProcessing(true);
        setError(null);
        try {
          const result = playbackRef.current!.getProcessor().process(savedText);
          console.log('Process result - segments:', result.segments.length, 'paragraphs:', result.paragraphs.length);
          playbackRef.current!.setContent(result.segments, result.paragraphs);

          const restoredId = savedSegmentId || 0;
          currentSegmentIdRef.current = restoredId;
          setCurrentSegmentId(restoredId);
          playbackRef.current!.restoreState(restoredId);

          isInitializedRef.current = true;
        } catch (err) {
          console.error('Process error:', err);
          setError(err instanceof Error ? err.message : '处理失败');
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      }
    });

    const handleStatusChange = () => {
      setSyncStatus(provider.synced ? 'synced' : 'offline');
    };

    if (provider.ws) {
      provider.ws.addEventListener('open', handleStatusChange);
      provider.ws.addEventListener('close', handleStatusChange);
      provider.ws.addEventListener('error', handleStatusChange);
    }

    const observeText = () => {
      if (isProcessingRef.current) return;

      const text = ytext.toString();
      if (text && text.trim().length > 0 && text !== rawText) {
        isProcessingRef.current = true;
        setIsProcessing(true);
        setError(null);

        try {
          const result = playbackRef.current!.getProcessor().process(text);
          const { segments, paragraphs } = result;

          playbackRef.current!.setContent(segments, paragraphs);

          yplaybackState.set('currentSegmentId', 0);
          yplaybackState.set('updatedAt', Date.now());

          setRawText(text);
          currentSegmentIdRef.current = 0;
          setCurrentSegmentId(0);

          isInitializedRef.current = true;
        } catch (err) {
          console.error('Process error:', err);
          setError(err instanceof Error ? err.message : '处理失败');
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      }
    };

    ytext.observe(observeText);

    return () => {
      cleanupSeek();
      cleanupSegmentStart();
      cleanupError();
      playbackRef.current?.destroy();
      idbPersistence.current?.destroy();
      ytext.unobserve(observeText);
      if (provider.ws) {
        provider.ws.removeEventListener('open', handleStatusChange);
        provider.ws.removeEventListener('close', handleStatusChange);
        provider.ws.removeEventListener('error', handleStatusChange);
      }
    };
  }, [room, defaultSpeed, defaultVolume, provider, rawText, handleSeek]);

  const setText = useCallback((text: string) => {
    const ytext = provider.doc.getText('rawText');
    provider.doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, text);
    });
  }, [provider]);

  return {
    rawText,
    currentSegmentId,
    isProcessing,
    error,
    syncStatus,
    playbackController: playbackRef.current,
    setText,
    setCurrentSegmentId,
  };
}
