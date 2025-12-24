import React from 'react';
import { Button } from './button';

interface LoadingStateProps {
  message?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export function LoadingState({ 
  message = "Loading...", 
  showBackButton = false,
  onBack,
  className = ""
}: LoadingStateProps) {
  return (
    <div className={`relative flex min-h-screen w-full flex-col font-display bg-background dark:bg-background ${className}`}>
      <div className="flex flex-col flex-1 justify-center items-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {showBackButton && onBack && (
          <Button onClick={onBack} variant="outline">
            返回
          </Button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  action,
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`relative flex min-h-screen w-full flex-col font-display bg-background dark:bg-background ${className}`}>
      <div className="flex flex-col flex-1 justify-center items-center p-4 text-center">
        <h2 className="text-xl font-semibold mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mb-6 max-w-md">
            {description}
          </p>
        )}
        {action}
      </div>
    </div>
  );
}