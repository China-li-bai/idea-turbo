'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceInputButtonProps {
  isReady: boolean;
  isProcessing: boolean;
  volume: number;
  interimText: string;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showVolumeWave?: boolean;
  className?: string;
}

export function VoiceInputButton({
  isReady,
  isProcessing,
  volume,
  interimText,
  onStart,
  onStop,
  disabled = false,
  size = 'md',
  showVolumeWave = true,
  className = ''
}: VoiceInputButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const startYRef = useRef(0);

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl'
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || !isReady || isProcessing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsPressed(true);
    setIsDragging(false);
    setDragY(0);
    startYRef.current = e.clientY;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    onStart();
  }, [disabled, isReady, isProcessing, onStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPressed) return;
    
    const deltaY = startYRef.current - e.clientY;
    setDragY(deltaY);
    
    if (deltaY > 50) {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  }, [isPressed]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isPressed) return;
    
    setIsPressed(false);
    setIsDragging(false);
    setDragY(0);
    
    onStop();
  }, [isPressed, onStop]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (!isPressed) return;
    
    setIsPressed(false);
    setIsDragging(false);
    setDragY(0);
    
    onStop();
  }, [isPressed, onStop]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    button.addEventListener('contextmenu', handleContextMenu);
    return () => button.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const getButtonState = () => {
    if (!isReady) return 'disabled';
    if (isProcessing && !isPressed) return 'processing';
    if (isPressed && isDragging) return 'cancel';
    if (isPressed) return 'recording';
    return 'idle';
  };

  const buttonState = getButtonState();

  const getStateStyles = () => {
    switch (buttonState) {
      case 'disabled':
        return 'bg-white/10 text-white/30 cursor-not-allowed';
      case 'processing':
        return 'bg-yellow-500/50 text-white animate-pulse';
      case 'cancel':
        return 'bg-red-500 text-white scale-110';
      case 'recording':
        return 'bg-red-500 text-white animate-pulse scale-105';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105';
    }
  };

  const getStateIcon = () => {
    switch (buttonState) {
      case 'disabled':
        return '🎤';
      case 'processing':
        return '⏳';
      case 'cancel':
        return '❌';
      case 'recording':
        return '🔴';
      default:
        return '🎤';
    }
  };

  const getStateHint = () => {
    switch (buttonState) {
      case 'disabled':
        return '初始化中...';
      case 'processing':
        return '识别中...';
      case 'cancel':
        return '松开取消';
      case 'recording':
        return '松开结束，上滑取消';
      default:
        return '按住说话';
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {isPressed && showVolumeWave && (
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-75"
            style={{ width: `${Math.min(volume * 2, 100)}%` }}
          />
        </div>
      )}

      {isPressed && interimText && (
        <div className="max-w-[200px] px-3 py-1.5 bg-white/10 rounded-lg text-white/70 text-sm text-center truncate">
          {interimText}
          <span className="animate-pulse">|</span>
        </div>
      )}

      <button
        ref={buttonRef}
        disabled={disabled || !isReady}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`
          ${sizeClasses[size]}
          rounded-full 
          flex 
          items-center 
          justify-center 
          transition-all 
          duration-150
          select-none
          touch-none
          ${getStateStyles()}
        `}
        style={{
          transform: isPressed && !isDragging ? 'scale(1.05)' : undefined
        }}
      >
        {getStateIcon()}
      </button>

      <span className="text-xs text-white/50">
        {getStateHint()}
      </span>

      {isDragging && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-red-500/90 rounded-lg text-white text-sm whitespace-nowrap animate-bounce">
          松开取消发送
        </div>
      )}
    </div>
  );
}
