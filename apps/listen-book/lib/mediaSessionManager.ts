export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

export interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onSeekBackward?: (details: { seekOffset?: number }) => void;
  onSeekForward?: (details: { seekOffset?: number }) => void;
}

export class MediaSessionManager {
  private isSupported: boolean;
  private handlers: MediaSessionHandlers = {};
  private currentMetadata: MediaMetadata | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'mediaSession' in navigator;
  }

  setup(handlers: MediaSessionHandlers): void {
    if (!this.isSupported) {
      console.warn('Media Session API is not supported');
      return;
    }

    this.handlers = handlers;

    const mediaSession = navigator.mediaSession;

    if (handlers.onPlay) {
      mediaSession.setActionHandler('play', handlers.onPlay);
    }

    if (handlers.onPause) {
      mediaSession.setActionHandler('pause', handlers.onPause);
    }

    if (handlers.onStop) {
      mediaSession.setActionHandler('stop', handlers.onStop);
    }

    if (handlers.onPreviousTrack) {
      mediaSession.setActionHandler('previoustrack', handlers.onPreviousTrack);
    }

    if (handlers.onNextTrack) {
      mediaSession.setActionHandler('nexttrack', handlers.onNextTrack);
    }

    if (handlers.onSeekBackward) {
      mediaSession.setActionHandler('seekbackward', handlers.onSeekBackward);
    }

    if (handlers.onSeekForward) {
      mediaSession.setActionHandler('seekforward', handlers.onSeekForward);
    }
  }

  setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (!this.isSupported) {
      return;
    }

    navigator.mediaSession.playbackState = state;
  }

  setMetadata(metadata: MediaMetadata): void {
    this.currentMetadata = metadata;

    if (!this.isSupported) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title || 'Unknown',
      artist: metadata.artist || 'Unknown',
      album: metadata.album || 'Unknown',
      artwork: metadata.artwork || []
    });
  }

  getCurrentMetadata(): MediaMetadata | null {
    return this.currentMetadata;
  }

  clearHandlers(): void {
    if (!this.isSupported) {
      return;
    }

    const mediaSession = navigator.mediaSession;

    mediaSession.setActionHandler('play', null);
    mediaSession.setActionHandler('pause', null);
    mediaSession.setActionHandler('stop', null);
    mediaSession.setActionHandler('previoustrack', null);
    mediaSession.setActionHandler('nexttrack', null);
    mediaSession.setActionHandler('seekbackward', null);
    mediaSession.setActionHandler('seekforward', null);

    this.handlers = {};
  }

  getSupported(): boolean {
    return this.isSupported;
  }
}
