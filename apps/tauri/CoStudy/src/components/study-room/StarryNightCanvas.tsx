/**
 * Starry Night Canvas - Philosophy UI
 * 
 * 星空模式：每完成一个Session，点亮共享星空中的一颗星
 */

import { useCallback, useEffect, useMemo } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, Container, ISourceOptions } from "@tsparticles/engine";
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export function StarryNightCanvas() {
    const { peers, recentMessages } = useStudyRoom();
    const { userId, profile } = useUserProfile();

    // Initialize particles engine
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine);
    }, []);

    const particlesLoaded = useCallback(async (container: Container | undefined) => {
        // console.log('Particles loaded', container);
    }, []);

    // Starry night configuration
    const options: ISourceOptions = useMemo(() => ({
        background: {
            color: {
                value: "transparent"
            }
        },
        fpsLimit: 60,
        particles: {
            number: {
                value: 300,
                density: {
                    enable: true,
                    width: 1920,
                    height: 1080
                }
            },
            color: {
                value: ["#ffffff", "#a8c8ff", "#ffe4b5"]
            },
            shape: {
                type: "circle"
            },
            opacity: {
                value: { min: 0.1, max: 1 },
                animation: {
                    enable: true,
                    speed: 0.5,
                    sync: false
                }
            },
            size: {
                value: { min: 1, max: 3 }
            },
            move: {
                enable: true,
                speed: 0.2,
                direction: "none",
                random: true,
                straight: false,
                outModes: {
                    default: "out"
                }
            }
        },
        detectRetina: true
    }), []);

    // Handle session completion to add user stars
    useEffect(() => {
        if (!recentMessages.length) return;
        const lastMsg = recentMessages[0];

        if (lastMsg.type === 'progress') {
            // TODO: Add user star to canvas when session completes
            // This would require accessing the particles instance
            console.log('Session completed, add star for user:', lastMsg.userId);
        }
    }, [recentMessages]);

    return (
        <div className="fixed inset-0 -z-10 pointer-events-none">
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #0A0E27 0%, #1A1F3A 100%)'
                }}
            />

            {/* Starry particles */}
            <Particles
                id="tsparticles"
                init={particlesInit}
                loaded={particlesLoaded}
                options={options}
            />
        </div>
    );
}
