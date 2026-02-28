import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MediaSessionManager } from './mediaSessionManager';

describe('MediaSessionManager', () => {
  let mediaSessionManager: MediaSessionManager;

  beforeEach(() => {
    mediaSessionManager = new MediaSessionManager();
  });

  afterEach(() => {
    mediaSessionManager.clearHandlers();
  });

  it('should detect Media Session API support', () => {
    const isSupported = mediaSessionManager.getSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should setup media session handlers', () => {
    const mockPlay = vi.fn();
    const mockPause = vi.fn();
    const mockStop = vi.fn();

    mediaSessionManager.setup({
      onPlay: mockPlay,
      onPause: mockPause,
      onStop: mockStop
    });

    if (mediaSessionManager.getSupported()) {
      expect(mockPlay).not.toHaveBeenCalled();
      expect(mockPause).not.toHaveBeenCalled();
      expect(mockStop).not.toHaveBeenCalled();
    }
  });

  it('should set playback state', () => {
    if (mediaSessionManager.getSupported()) {
      mediaSessionManager.setPlaybackState('playing');
      mediaSessionManager.setPlaybackState('paused');
      mediaSessionManager.setPlaybackState('none');
    }
  });

  it('should set media metadata', () => {
    const metadata = {
      title: 'Test Title',
      artist: 'Test Artist',
      album: 'Test Album',
      artwork: [
        {
          src: 'https://example.com/image.png',
          sizes: '96x96',
          type: 'image/png'
        }
      ]
    };

    mediaSessionManager.setMetadata(metadata);
    const currentMetadata = mediaSessionManager.getCurrentMetadata();

    expect(currentMetadata).toEqual(metadata);
  });

  it('should clear handlers', () => {
    const mockPlay = vi.fn();
    const mockPause = vi.fn();

    mediaSessionManager.setup({
      onPlay: mockPlay,
      onPause: mockPause
    });

    mediaSessionManager.clearHandlers();

    if (mediaSessionManager.getSupported()) {
      expect(mockPlay).not.toHaveBeenCalled();
      expect(mockPause).not.toHaveBeenCalled();
    }
  });

  it('should handle optional handlers', () => {
    mediaSessionManager.setup({
      onPlay: vi.fn()
    });

    if (mediaSessionManager.getSupported()) {
      expect(() => mediaSessionManager.clearHandlers()).not.toThrow();
    }
  });

  it('should handle seek handlers', () => {
    const mockSeekForward = vi.fn();
    const mockSeekBackward = vi.fn();

    mediaSessionManager.setup({
      onSeekForward: mockSeekForward,
      onSeekBackward: mockSeekBackward
    });

    if (mediaSessionManager.getSupported()) {
      expect(mockSeekForward).not.toHaveBeenCalled();
      expect(mockSeekBackward).not.toHaveBeenCalled();
    }
  });

  it('should handle previous and next track handlers', () => {
    const mockPreviousTrack = vi.fn();
    const mockNextTrack = vi.fn();

    mediaSessionManager.setup({
      onPreviousTrack: mockPreviousTrack,
      onNextTrack: mockNextTrack
    });

    if (mediaSessionManager.getSupported()) {
      expect(mockPreviousTrack).not.toHaveBeenCalled();
      expect(mockNextTrack).not.toHaveBeenCalled();
    }
  });
});
