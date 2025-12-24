/**
 * Campfire Canvas - Philosophy UI
 * 
 * 篝火模式：围坐在虚拟篝火旁的温暖氛围
 */

import { useEffect, useRef } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    color: string;
}

interface UserLight {
    userId: string;
    x: number;
    y: number;
    color: string;
    pulsePhase: number;
    isPulsing: boolean;
}

export function CampfireCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const userLightsRef = useRef<UserLight[]>([]);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    const { peers, recentMessages } = useStudyRoom();
    const { userId, profile } = useUserProfile();

    // Flame texture (prerendered)
    const flameTextureRef = useRef<HTMLCanvasElement | null>(null);

    // Initialize flame texture
    useEffect(() => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 64;
        offCanvas.height = 64;
        const ctx = offCanvas.getContext('2d')!;

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 211, 63, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 107, 53, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();

        flameTextureRef.current = offCanvas;
    }, []);

    // Update user lights when peers change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.3;

        const allUsers = [
            { userId, color: profile?.avatar_color || '#4ECDC4' },
            ...Object.values(peers).map(p => ({ userId: p.id, color: p.avatarColor }))
        ];

        const angleStep = (Math.PI * 2) / allUsers.length;

        userLightsRef.current = allUsers.map((user, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return {
                userId: user.userId,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                color: user.color,
                pulsePhase: 0,
                isPulsing: false
            };
        });
    }, [peers, userId, profile]);

    // Handle pulse messages
    useEffect(() => {
        if (!recentMessages.length) return;
        const lastMsg = recentMessages[0];

        if (lastMsg.type === 'pulse') {
            const light = userLightsRef.current.find(l => l.userId === lastMsg.userId);
            if (light) {
                light.isPulsing = true;
                light.pulsePhase = 0;
            }
        }
    }, [recentMessages]);

    // Main animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false })!;

        // Resize canvas
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Device performance check
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        const maxParticles = isMobile ? 200 : 400;
        const emissionRate = isMobile ? 5 : 10;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Create initial particles
        const createParticle = (): Particle => {
            const angle = Math.random() * Math.PI * 2;
            const spread = Math.random() * 20;
            return {
                x: centerX + Math.cos(angle) * spread,
                y: centerY + Math.sin(angle) * spread,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 2,
                size: Math.random() * 3 + 2,
                life: 0,
                maxLife: Math.random() * 1000 + 1000,
                color: `hsla(${Math.random() * 30 + 15}, 100%, ${Math.random() * 30 + 50}%, ${Math.random() * 0.5 + 0.5})`
            };
        };

        const animate = (time: number) => {
            const deltaTime = time - lastTimeRef.current;
            lastTimeRef.current = time;

            // Clear canvas
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Emit new particles
            for (let i = 0; i < emissionRate; i++) {
                if (particlesRef.current.length < maxParticles) {
                    particlesRef.current.push(createParticle());
                }
            }

            // Update and draw particles
            particlesRef.current = particlesRef.current.filter(p => {
                p.life += deltaTime;
                if (p.life >= p.maxLife) return false;

                // Physics
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // gravity
                p.vx += (Math.random() - 0.5) * 0.3; // turbulence

                // Fade based on life
                const lifeRatio = p.life / p.maxLife;
                const alpha = (1 - lifeRatio) * 0.8;
                const size = p.size * (1 + lifeRatio * 3);

                // Draw particle using prerendered texture
                if (flameTextureRef.current) {
                    ctx.globalAlpha = alpha;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(
                        flameTextureRef.current,
                        p.x - size / 2,
                        p.y - size / 2,
                        size,
                        size
                    );
                }

                return true;
            });

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Draw user lights
            userLightsRef.current.forEach(light => {
                if (light.isPulsing) {
                    light.pulsePhase += deltaTime * 0.005;
                    if (light.pulsePhase >= Math.PI * 2) {
                        light.isPulsing = false;
                        light.pulsePhase = 0;
                    }
                }

                const basePulse = Math.sin(time * 0.002) * 0.2 + 0.8;
                const pulseFactor = light.isPulsing
                    ? Math.sin(light.pulsePhase) * 0.5 + 1.5
                    : 1;
                const opacity = basePulse * pulseFactor * 0.6;
                const size = (8 + Math.sin(time * 0.003 + light.x) * 2) * pulseFactor;

                // Glow
                const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, size * 3);
                gradient.addColorStop(0, light.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba'));
                gradient.addColorStop(0.5, light.color.replace(')', `, ${opacity * 0.3})`).replace('rgb', 'rgba'));
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(light.x, light.y, size * 3, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = light.color;
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                ctx.arc(light.x, light.y, size, 0, Math.PI * 2);
                ctx.fill();
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
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ 
                background: 'linear-gradient(to bottom, #0a0a0a, #1a0a0a)',
                zIndex: -1
            }}
        />
    );
}
