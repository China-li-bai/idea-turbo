/**
 * Philosophy Background - 学习场景的背景组件
 * 
 * 集成篝火和星空模式到学习页面，提供"陪伴，但不打扰"的体验
 */

import { useState, useEffect } from 'react';
import { CampfireCanvas } from './CampfireCanvas';
import { StarryNightCanvasSimple } from './StarryNightCanvasSimple';

export type PhilosophyMode = 'campfire' | 'starry' | 'none';

interface PhilosophyBackgroundProps {
    mode: PhilosophyMode;
    children?: React.ReactNode;
    className?: string;
}

export function PhilosophyBackground({ mode, children, className }: PhilosophyBackgroundProps) {
    const [isClient, setIsClient] = useState(false);

    // 确保只在客户端渲染，避免SSR问题
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || mode === 'none') {
        return <div className={className}>{children}</div>;
    }

    return (
        <div className={`relative ${className}`}>
            {/* Philosophy Background - 柔和的背景效果 */}
            {mode === 'campfire' ? (
                <CampfireCanvas />
            ) : mode === 'starry' ? (
                <StarryNightCanvasSimple />
            ) : null}

            {/* 学习内容 - 确保内容可读性 */}
            <div className="relative z-10">
                {/* 柔和的遮罩层，增强内容可读性 */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
                
                {/* 实际内容 */}
                <div className="relative">
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * 学习场景专用的 Philosophy Background
 * 
 * 为学习页面优化的背景组件，更加含蓄，不干扰学习
 */
interface LearningPhilosophyBackgroundProps {
    userId?: string;
    isConnected?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function LearningPhilosophyBackground({ 
    userId, 
    isConnected, 
    children, 
    className 
}: LearningPhilosophyBackgroundProps) {
    // 从用户偏好或随机选择背景模式
    const [mode] = useState<PhilosophyMode>(() => {
        // 可以从用户设置获取偏好，这里简单随机
        return Math.random() > 0.5 ? 'starry' : 'campfire';
    });

    // 如果用户未连接，显示更简洁的背景
    if (!userId || !isConnected) {
        return (
            <div className={`relative ${className}`}>
                {/* 简单的背景，不分散注意力 */}
                <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 opacity-50 -z-10" />
                <div className="relative z-10">{children}</div>
            </div>
        );
    }

    return (
        <PhilosophyBackground mode={mode} className={className}>
            {children}
        </PhilosophyBackground>
    );
}