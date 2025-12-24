/**
 * Philosophy Settings - 学习背景设置
 * 
 * 允许用户自定义学习时的背景模式
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Flame, Sparkles, X, Heart, Brain } from 'lucide-react';
import type { PhilosophyMode } from './PhilosophyBackground';

interface PhilosophySettingsProps {
    isOpen: boolean;
    onClose: () => void;
    currentMode: PhilosophyMode;
    onModeChange: (mode: PhilosophyMode) => void;
    isConnected: boolean;
}

export function PhilosophySettings({ 
    isOpen, 
    onClose, 
    currentMode, 
    onModeChange,
    isConnected
}: PhilosophySettingsProps) {
    const [tempMode, setTempMode] = useState<PhilosophyMode>(currentMode);
    const [showPulseEffect, setShowPulseEffect] = useState(true);
    const [backgroundOpacity, setBackgroundOpacity] = useState(0.6);

    if (!isOpen) return null;

    const handleSave = () => {
        onModeChange(tempMode);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-white/20">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-light">学习陪伴设置</CardTitle>
                            <CardDescription className="text-sm">
                                定制你的学习氛围，感受温柔的陪伴
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {/* 背景模式选择 */}
                    <div>
                        <Label className="text-base font-medium mb-4 block">背景模式</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setTempMode('campfire')}
                                className={`
                                    p-4 rounded-lg border-2 transition-all text-center
                                    ${tempMode === 'campfire' 
                                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' 
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }
                                `}
                            >
                                <Flame className={`h-6 w-6 mx-auto mb-2 ${tempMode === 'campfire' ? 'text-orange-500' : 'text-slate-500'}`} />
                                <div className="text-sm font-medium">篝火</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">温暖陪伴</div>
                            </button>
                            
                            <button
                                onClick={() => setTempMode('starry')}
                                className={`
                                    p-4 rounded-lg border-2 transition-all text-center
                                    ${tempMode === 'starry' 
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }
                                `}
                            >
                                <Sparkles className={`h-6 w-6 mx-auto mb-2 ${tempMode === 'starry' ? 'text-blue-500' : 'text-slate-500'}`} />
                                <div className="text-sm font-medium">星空</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">静谧思考</div>
                            </button>
                            
                            <button
                                onClick={() => setTempMode('none')}
                                className={`
                                    p-4 rounded-lg border-2 transition-all text-center
                                    ${tempMode === 'none' 
                                        ? 'border-slate-400 bg-slate-50 dark:bg-slate-800' 
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }
                                `}
                            >
                                <div className="h-6 w-6 mx-auto mb-2 rounded-full bg-slate-200 dark:bg-slate-600" />
                                <div className="text-sm font-medium">无</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">专注模式</div>
                            </button>
                        </div>
                    </div>

                    <Separator />

                    {/* 连接状态提示 */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <div>
                                <div className="text-sm font-medium">
                                    {isConnected ? '已连接学习房间' : '未连接学习房间'}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {isConnected 
                                        ? '你可以看到其他学习者的光点，他们也能看到你' 
                                        : '连接后可以看到其他学习者的状态'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 交互效果设置 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="pulse-effect" className="text-sm font-medium">学习脉冲效果</Label>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    完成卡片时显示脉冲，让同伴感知你的努力
                                </div>
                            </div>
                            <Switch 
                                id="pulse-effect" 
                                checked={showPulseEffect}
                                onCheckedChange={setShowPulseEffect}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="background-opacity" className="text-sm font-medium">背景强度</Label>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    调整背景的视觉强度
                                </div>
                            </div>
                            <input
                                id="background-opacity"
                                type="range"
                                min="0.2"
                                max="1"
                                step="0.1"
                                value={backgroundOpacity}
                                onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                                className="w-24"
                            />
                        </div>
                    </div>

                    {/* 哲学理念 */}
                    <div className="text-center py-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium italic">"陪伴，但不打扰"</span>
                            <Brain className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            温暖的背景和微妙的存在感，让你在学习的路上不再孤单
                        </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            取消
                        </Button>
                        <Button onClick={handleSave} className="flex-1">
                            应用设置
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}