import { useEffect, useRef, useState, useCallback } from 'react';
import useYProvider from 'y-partykit/react';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { TextSegment, TextParagraph } from '../../party/types';
import { TextProcessor } from '../../party/modules/processor';
import { PlaybackController } from '../../party/modules/playback';

interface UseTextReaderOptions {
  room: string;
  defaultSpeed?: number;
  defaultVolume?: number;
}

interface UseTextReaderReturn {
  rawText: string;
  segments: TextSegment[];
  paragraphs: TextParagraph[];
  currentSegmentId: number;
  isProcessing: boolean;
  error: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline';
  playbackController: PlaybackController | null;
  processor: TextProcessor;
  setText: (text: string) => void;
  setCurrentSegmentId: (id: number) => void;
}

export function useTextReader({
  room,
  defaultSpeed = 1,
  defaultVolume = 1,
}: UseTextReaderOptions): UseTextReaderReturn {
  const [rawText, setRawText] = useState('');
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [paragraphs, setParagraphs] = useState<TextParagraph[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');

  const processorRef = useRef<TextProcessor>(new TextProcessor());
  const playbackRef = useRef<PlaybackController | null>(null);
  const idbPersistence = useRef<IndexeddbPersistence | null>(null);
  const isProcessingRef = useRef(false);

  const provider = useYProvider({ room });

  const processAndStore = useCallback((text: string) => {
    const processor = processorRef.current;
    const { processedText, segments: newSegments, paragraphs: newParagraphs } = processor.process(text);

    const yplaybackState = provider.doc.getMap('playbackState');
    provider.doc.transact(() => {
      yplaybackState.set('segments', newSegments);
      yplaybackState.set('paragraphs', newParagraphs);
      yplaybackState.set('updatedAt', Date.now());
    });

    setSegments(newSegments);
    setParagraphs(newParagraphs);

    if (playbackRef.current) {
      playbackRef.current.setContent(newSegments, newParagraphs);
    }

    setCurrentSegmentId(0);
  }, [provider]);

  useEffect(() => {
    const ytext = provider.doc.getText('rawText');
    const yplaybackState = provider.doc.getMap('playbackState');

    playbackRef.current = PlaybackController.create({
      defaultSpeed,
      defaultVolume,
      autoPlay: false,
    });

    playbackRef.current.on('segmentStart', ({ segment }) => {
      setCurrentSegmentId(segment.id);
      yplaybackState.set('currentSegmentId', segment.id);
    });

    playbackRef.current.on('play', () => {
      yplaybackState.set('isPlaying', true);
      yplaybackState.set('isPaused', false);
    });

    playbackRef.current.on('pause', () => {
      yplaybackState.set('isPlaying', false);
      yplaybackState.set('isPaused', true);
    });

    playbackRef.current.on('stop', () => {
      yplaybackState.set('isPlaying', false);
      yplaybackState.set('isPaused', false);
      yplaybackState.set('currentSegmentId', 0);
      setCurrentSegmentId(0);
    });

    playbackRef.current.on('complete', () => {
      yplaybackState.set('isPlaying', false);
      yplaybackState.set('isPaused', false);
    });

    playbackRef.current.on('error', ({ error: err }) => {
      setError(err?.message || '播放错误');
    });

    idbPersistence.current = new IndexeddbPersistence(`textreader-${room}`, provider.doc);

    idbPersistence.current.on('synced', () => {
      console.log('IndexedDB synced!');
      setSyncStatus('synced');
      const savedText = ytext.toString();
      const savedSegments = yplaybackState.get('segments') as TextSegment[] | undefined;
      const savedParagraphs = yplaybackState.get('paragraphs') as TextParagraph[] | undefined;

      console.log('From IndexedDB - savedText:', savedText?.substring(0, 50), 'savedSegments:', savedSegments?.length);
      setRawText(savedText);
      if (savedSegments && savedParagraphs) {
        console.log('Restoring from IndexedDB - segments:', savedSegments.length);
        setSegments(savedSegments);
        setParagraphs(savedParagraphs);
        playbackRef.current?.setContent(savedSegments, savedParagraphs);
      } else {
        console.log('No saved segments found in IndexedDB');
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
      console.log('observeText triggered, isProcessingRef:', isProcessingRef.current);
      if (isProcessingRef.current) {
        console.log('Skipping because isProcessingRef is true');
        return;
      }
      const text = ytext.toString();
      console.log('observeText text length:', text.length, 'content:', text.substring(0, 100));
      if (text && text.trim().length > 0) {
        isProcessingRef.current = true;
        setIsProcessing(true);
        setError(null);
        try {
          const result = processorRef.current.process(text);
          console.log('Process result - segments:', result.segments.length, 'paragraphs:', result.paragraphs.length);
          const { segments: newSegments, paragraphs: newParagraphs } = result;
          provider.doc.transact(() => {
            yplaybackState.set('segments', newSegments);
            yplaybackState.set('paragraphs', newParagraphs);
            yplaybackState.set('updatedAt', Date.now());
          });
          setRawText(text);
          setSegments(newSegments);
          setParagraphs(newParagraphs);
          playbackRef.current?.setContent(newSegments, newParagraphs);
          setCurrentSegmentId(0);
          console.log('After setSegments, state segments:', newSegments.length);
        } catch (err) {
          console.error('Process error:', err);
          setError(err instanceof Error ? err.message : '处理失败');
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      } else {
        console.log('Text is empty or whitespace, skipping');
      }
    };

    ytext.observe(observeText);

    return () => {
      playbackRef.current?.destroy();
      idbPersistence.current?.destroy();
      ytext.unobserve(observeText);
      if (provider.ws) {
        provider.ws.removeEventListener('open', handleStatusChange);
        provider.ws.removeEventListener('close', handleStatusChange);
        provider.ws.removeEventListener('error', handleStatusChange);
      }
    };
  }, [room, defaultSpeed, defaultVolume]);

  const setText = useCallback((text: string) => {
    console.log('setText called with:', text.substring(0, 50));
    const ytext = provider.doc.getText('rawText');
    console.log('Current ytext length:', ytext.length);
    provider.doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, text);
    });
    console.log('After insert, ytext:', ytext.toString().substring(0, 50));
  }, [provider]);

  return {
    rawText,
    segments,
    paragraphs,
    currentSegmentId,
    isProcessing,
    error,
    syncStatus,
    playbackController: playbackRef.current,
    processor: processorRef.current,
    setText,
    setCurrentSegmentId,
  };
}
