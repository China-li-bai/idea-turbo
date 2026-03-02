'use client';

import { useState, useEffect, useRef } from 'react';

export interface VoiceTextEditModalProps {
  isOpen: boolean;
  initialText: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
  onRetry?: () => void;
  placeholder?: string;
  maxLength?: number;
  title?: string;
}

export function VoiceTextEditModal({
  isOpen,
  initialText,
  onConfirm,
  onCancel,
  onRetry,
  placeholder = '识别的文字将显示在这里...',
  maxLength = 500,
  title = '确认发送内容'
}: VoiceTextEditModalProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, [isOpen, text.length]);

  const handleConfirm = () => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onConfirm(trimmedText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onCancel}
              className="text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full h-32 px-4 py-3 bg-white/5 text-white placeholder-white/30 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            />
            <div className="absolute bottom-2 right-2 text-xs text-white/30">
              {text.length}/{maxLength}
            </div>
          </div>

          {text.trim() !== initialText.trim() && (
            <div className="flex items-center gap-2 text-xs text-yellow-400/80">
              <span>⚠️</span>
              <span>内容已修改</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <span>🎤</span>
              <span>重新录音</span>
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl hover:bg-white/10 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!text.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <span>发送</span>
            <span className="text-xs opacity-70">⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
