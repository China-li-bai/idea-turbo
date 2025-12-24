import React from 'react';
import { SyncButton } from '@/components/SyncButton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 同步页面
 * 
 * 专门用于用户手动同步数据的页面
 * 符合 Linus "Never Break Userspace" 原则 - 只在用户明确要求时进行网络操作
 */
export function SyncPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">数据同步</h1>
        <div className="w-10" /> {/* 占位符保持居中 */}
      </header>

      <main className="flex justify-center">
        <SyncButton />
      </main>
    </div>
  );
}