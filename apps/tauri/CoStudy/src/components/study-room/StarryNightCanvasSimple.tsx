/**
 * Simple Starry Night Canvas
 * 
 * 一个简化的星空背景，不依赖外部库
 * 使用Canvas API直接渲染星星
 */

import { useEffect, useRef, useState } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Star {
    x: number;
    y: number;
    size: number;
    brightness: number;
    twinkleSpeed: number;
    twinklePhase: number;
    color: string;
}

interface UserStar {
    userId: string;
    x: number;
    y: number;
    size: number;
    color: string;
    pulsePhase: number;
    isPulsing: boolean;
}

export function StarryNightCanvasSimple() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<Star[]>([]);
    const userStarsRef = useRef<UserStar[]>([]);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const [isInitialized, setIsInitialized] = useState(false);

    const { peers, recentMessages } = useStudyRoom();
    const { userId, profile } = useUserProfile();

    // Initialize stars
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create initial stars
        const starCount = 200;
        const stars: Star[] = [];
        const colors = ['#ffffff', '#a8c8ff', '#ffe4b5'];

        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        starsRef.current = stars;
        setIsInitialized(true);
    }, []);

    // Update user stars when peers change
    useEffect(() => {
        if (!isInitialized) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = 0.5; // Use normalized coordinates (0-1)
        const centerY = 0.5;
        const radius = 0.3;

        const allUsers = [
            { userId, color: profile?.avatar_color || '#4ECDC4' },
            ...Object.values(peers).map(p => ({ userId: p.id, color: p.avatarColor }))
        ];

        const angleStep = (Math.PI * 2) / allUsers.length;

        userStarsRef.current = allUsers.map((user, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return {
                userId: user.userId,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                size: 0.015, // Larger than regular stars
                color: user.color,
                pulsePhase: 0,
                isPulsing: false
            };
        });
    }, [peers, userId, profile, isInitialized]);

    // Handle pulse messages
    useEffect(() => {
        if (!recentMessages.length || !isInitialized) return;
        const lastMsg = recentMessages[0];

        if (lastMsg.type === 'pulse') {
            const star = userStarsRef.current.find(s => s.userId === lastMsg.userId);
            if (star) {
                star.isPulsing = true;
                star.pulsePhase = 0;
            }
        }
    }, [recentMessages, isInitialized]);

    // Main animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isInitialized) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const animate = (time: number) => {
            const deltaTime = time - lastTimeRef.current;
            lastTimeRef.current = time;

            // Clear canvas
            ctx.fillStyle = '#0A0E27';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#0A0E27');
            gradient.addColorStop(1, '#1A1F3A');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw regular stars
            starsRef.current.forEach(star => {
                star.twinklePhase += star.twinkleSpeed;
                
                const x = star.x * canvas.width;
                const y = star.y * canvas.height;
                const brightness = star.brightness * (0.7 + Math.sin(star.twinklePhase) * 0.3);
                const size = star.size * (0.8 + Math.sin(star.twinklePhase * 1.5) * 0.2);
                
                // Star glow
                const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
                glowGradient.addColorStop(0, star.color.replace(')', `, ${brightness})`).replace('rgb', 'rgba'));
                glowGradient.addColorStop(0.5, star.color.replace(')', `, ${brightness * 0.3})`).replace('rgb', 'rgba'));
                glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(x, y, size * 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Star core
                ctx.fillStyle = star.color;
                ctx.globalAlpha = brightness;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // Draw user stars
            userStarsRef.current.forEach(star => {
                if (star.isPulsing) {
                    star.pulsePhase += deltaTime * 0.005;
                    if (star.pulsePhase >= Math.PI * 2) {
                        star.isPulsing = false;
                        star.pulsePhase = 0;
                    }
                }

                const x = star.x * canvas.width;
                const y = star.y * canvas.height;
                
                const basePulse = Math.sin(time * 0.001) * 0.2 + 0.8;
                const pulseFactor = star.isPulsing
                    ? Math.sin(star.pulsePhase) * 0.5 + 1.5
                    : 1;
                const opacity = basePulse * pulseFactor * 0.8;
                const size = star.size * canvas.width * (0.8 + Math.sin(time * 0.002 + star.x) * 0.2) * pulseFactor;
                
                // User star glow
                const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
                glowGradient.addColorStop(0, star.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba'));
                glowGradient.addColorStop(0.5, star.color.replace(')', `, ${opacity * 0.3})`).replace('rgb', 'rgba'));
                glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(x, y, size * 3, 0, Math.PI * 2);
                ctx.fill();
                
                // User star core
                ctx.fillStyle = star.color;
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add sparkle effect for user stars
                if (star.isPulsing) {
                    ctx.strokeStyle = star.color;
                    ctx.globalAlpha = opacity * 0.5;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x - size * 2, y);
                    ctx.lineTo(x + size * 2, y);
                    ctx.moveTo(x, y - size * 2);
                    ctx.lineTo(x, y + size * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
                
                ctx.globalAlpha = 1;
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            window.removeEventListener('resize', resize);
        };
    }, [isInitialized]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ 
                background: 'linear-gradient(to bottom, #0A0E27, #1A1F3A)',
                zIndex: -1
            }}
        />
    );
}