'use client';

import { useState, useEffect, useRef } from 'react';

const useI18n = () => ({ locale: 'zh' });

interface CatMascotProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'tiny';
  mood?: 'happy' | 'encouraging' | 'thinking' | 'sleeping' | 'excited';
  showSpeech?: boolean;
}

const PIXEL_COLORS = {
  body: '#FFB6C1',
  bodyDark: '#FF69B4',
  ear: '#FF69B4',
  eye: '#2D1B0E',
  pupil: '#000000',
  nose: '#FF1493',
  mouth: '#8B4513',
  whisker: '#DEB887',
  tail: '#FFB6C1',
  belly: '#FFF0F5',
};

export default function CatMascot({ 
  className = '',
  size = 'medium',
  mood = 'happy',
  showSpeech = true,
}: CatMascotProps) {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [breathOffset, setBreathOffset] = useState(0);
  const [tailWag, setTailWag] = useState(0);
  const [currentMood, setCurrentMood] = useState(mood);
  const [showHeart, setShowHeart] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale } = useI18n();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      const maxMove = size === 'tiny' ? 3 : (size === 'small' ? 5 : 7);
      const moveX = Math.max(-maxMove, Math.min(maxMove, deltaX / 25));
      const moveY = Math.max(-maxMove, Math.min(maxMove, deltaY / 25));
      
      setEyePosition({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    let frame = 0;
    const breathe = () => {
      frame++;
      setBreathOffset(Math.sin(frame * 0.05) * 2);
      setTailWag(Math.sin(frame * 0.08) * 15);
      requestAnimationFrame(breathe);
    };
    
    const animationId = requestAnimationFrame(breathe);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    if (mood !== currentMood) {
      setCurrentMood(mood);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  }, [mood, currentMood]);

  const sizes = {
    tiny: { scale: 0.5, pixelSize: 3 },
    small: { scale: 0.75, pixelSize: 4 },
    medium: { scale: 1, pixelSize: 5 },
    large: { scale: 1.5, pixelSize: 6 },
  };

  const { scale, pixelSize } = sizes[size];

  const getMoodMessage = () => {
    const messages: Record<string, Record<string, string>> = {
      zh: {
        happy: '喵~ 加油！你做得很棒！',
        encouraging: '相信自己，你可以的！💪',
        thinking: '让我想想怎么帮你...',
        sleeping: 'zzZ... 我在等你回来~',
        excited: '太棒了！继续前进！✨',
      },
      en: {
        happy: 'Meow~ You\'re doing great!',
        encouraging: 'Believe in yourself! 💪',
        thinking: 'Let me think how to help...',
        sleeping: 'zzZ... Waiting for you~',
        excited: 'Amazing! Keep going! ✨',
      },
      ja: {
        happy: 'ニャー！頑張ってるね！',
        encouraging: '自分を信じて！💪',
        thinking: 'どう手伝おうかな...',
        sleeping: 'zzZ... 待ってるよ~',
        excited: '素晴らしい！続けよう！✨',
      },
    };
    
    const lang = locale === 'zh' || locale === 'en' || locale === 'ja' ? locale : 'en';
    return messages[lang]?.[currentMood] || messages.en[currentMood];
  };

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{ 
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        imageRendering: 'pixelated',
      }}
    >
      <div
        className="relative transition-transform duration-200"
        style={{ transform: `translateY(${breathOffset}px)` }}
      >
        <svg width="80" height="90" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pixelGrid" width="1" height="1" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="currentColor"/>
            </pattern>
          </defs>

          <g id="ears">
            <rect x="2" y="0" width="3" height="3" fill={PIXEL_COLORS.ear}/>
            <rect x="11" y="0" width="3" height="3" fill={PIXEL_COLORS.ear}/>
            <rect x="3" y="1" width="2" height="2" fill={PIXEL_COLORS.bodyDark}/>
            <rect x="11" y="1" width="2" height="2" fill={PIXEL_COLORS.bodyDark}/>
          </g>

          <g id="head">
            <rect x="3" y="2" width="10" height="9" fill={PIXEL_COLORS.body}/>
            <rect x="4" y="11" width="8" height="2" fill={PIXEL_COLORS.bodyDark}/>
          </g>

          <g id="eyes">
            {!isBlinking ? (
              <>
                <g style={{ transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)` }}>
                  <rect x="5" y="5" width="2" height="2" fill={PIXEL_COLORS.eye}/>
                  <rect x="5.5" y="5.5" width="1" height="1" fill={PIXEL_COLORS.pupil}/>
                </g>
                <g style={{ transform: `translate(${eyePosition.x + (size === 'tiny' ? 2 : 3)}px, ${eyePosition.y}px)` }}>
                  <rect x="9" y="5" width="2" height="2" fill={PIXEL_COLORS.eye}/>
                  <rect x="9.5" y="5.5" width="1" height="1" fill={PIXEL_COLORS.pupil}/>
                </g>
              </>
            ) : (
              <>
                <line x1="5" y1="6" x2="7" y2="6" stroke={PIXEL_COLORS.eye} strokeWidth="0.5"/>
                <line x1="9" y1="6" x2="11" y2="6" stroke={PIXEL_COLORS.eye} strokeWidth="0.5"/>
              </>
            )}
            
            {(currentMood === 'encouraging' || currentMood === 'excited') && (
              <>
                <circle cx="4" cy="4" r="0.5" fill="#FFD700" opacity="0.8"/>
                <circle cx="12" cy="4" r="0.5" fill="#FFD700" opacity="0.8"/>
              </>
            )}
          </g>

          <g id="nose-mouth">
            <rect x="7.5" y="8" width="1" height="0.8" fill={PIXEL_COLORS.nose}/>
            <path d="M 7 9 Q 8 10 9 9" stroke={PIXEL_COLORS.mouth} strokeWidth="0.3" fill="none"/>
          </g>

          <g id="whiskers" opacity="0.6">
            <line x1="2" y1="7" x2="4" y2="7.5" stroke={PIXEL_COLORS.whisker} strokeWidth="0.15"/>
            <line x1="2" y1="8" x2="4" y2="8" stroke={PIXEL_COLORS.whisker} strokeWidth="0.15"/>
            <line x1="12" y1="7.5" x2="14" y2="7" stroke={PIXEL_COLORS.whisker} strokeWidth="0.15"/>
            <line x1="12" y1="8" x2="14" y2="8" stroke={PIXEL_COLORS.whisker} strokeWidth="0.15"/>
          </g>

          <g id="body">
            <rect x="4" y="13" width="8" height="4" fill={PIXEL_COLORS.body}/>
            <rect x="5" y="14" width="6" height="2" fill={PIXEL_COLORS.belly}/>
          </g>

          <g id="tail" style={{ 
            transformOrigin: '12px 14px', 
            transform: `rotate(${tailWag}deg)` 
          }}>
            <rect x="12" y="13" width="3" height="2" fill={PIXEL_COLORS.tail}/>
            <rect x="14" y="12" width="1" height="3" fill={PIXEL_COLORS.tail}/>
          </g>

          <g id="feet">
            <rect x="4" y="17" width="2" height="1" fill={PIXEL_COLORS.bodyDark}/>
            <rect x="10" y="17" width="2" height="1" fill={PIXEL_COLORS.bodyDark}/>
          </g>

          {showHeart && (
            <text x="12" y="3" fontSize="3" fill="#FF69B4" className="animate-bounce">
              ❤️
            </text>
          )}
          
          {currentMood === 'sleeping' && (
            <text x="10" y="4" fontSize="2" fill="#87CEEB">z</text>
          )}
        </svg>
      </div>

      {showSpeech && (
        <div 
          className={`mt-2 px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 rounded-lg backdrop-blur-sm transition-all duration-300 ${
            currentMood === 'excited' ? 'animate-bounce' : ''
          }`}
        >
          <p className="text-xs font-medium text-white whitespace-nowrap">
            {getMoodMessage()}
          </p>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce {
          animation: bounce 0.6s ease-in-out infinite;
        }

        svg {
          filter: drop-shadow(0 2px 4px rgba(255, 105, 180, 0.3));
          transition: filter 0.3s ease;
        }

        svg:hover {
          filter: drop-shadow(0 4px 8px rgba(255, 105, 180, 0.5));
        }

        g#tail {
          transition: transform 0.1s ease-out;
        }
      `}</style>
    </div>
  );
}
