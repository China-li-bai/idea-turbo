import { useState, useRef, useEffect, useCallback } from 'react';
import { useUnifiedItems } from '@/lib/hooks/useUnifiedItems';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { smartScheduler } from '@/lib/services/smartScheduler';
import {
  processQuery,
  type ProposalData,
  type ProposalAction,
  type QueryResult,
} from '@/lib/services/secretaryQueryProcessor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposal?: ProposalData;
  actions?: ProposalAction[];
  isStreaming?: boolean;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useSecretaryChat(
  locale: string,
  isAIConfigured: boolean | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { items: allItems, toEvent } = useUnifiedItems();
  const addItem = useUnifiedStore((state) => state.addItem);
  const updateItem = useUnifiedStore((state) => state.updateItem);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeAction = useCallback(
    async (action: ProposalAction): Promise<{ success: boolean; error?: string }> => {
      const isZh = locale.startsWith('zh');

      try {
        if (action.type === 'create') {
          const { startTime, endTime, priority, description } = action.params;
          await addItem({
            id: action.targetId,
            type: 'event',
            title: action.targetTitle,
            content: (description as string) || action.targetTitle,
            startTime: startTime as number | null,
            endTime: endTime as number | null,
            isAllDay: false,
            embedding: [],
            embeddingUpdatedAt: 0,
            status: 'scheduled',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: {
              priority: priority as 'high' | 'medium' | 'low',
              description: description as string,
            },
          });
          return { success: true };
        }

        const item = allItems.find(i => i.id === action.targetId);
        if (!item) {
          return { success: false, error: isZh ? '找不到目标日程' : 'Target event not found' };
        }

        switch (action.type) {
          case 'reschedule': {
            const newDate = action.params.resolvedNewDate
              ? new Date(action.params.resolvedNewDate as string)
              : new Date();
            const currentStart = item.startTime ? new Date(item.startTime) : new Date();
            const duration = item.endTime && item.startTime ? item.endTime - item.startTime : 60 * 60 * 1000;
            const newStartTime = new Date(newDate);
            newStartTime.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);
            const newEndTime = new Date(newStartTime.getTime() + duration);
            await updateItem(item.id, { startTime: newStartTime.getTime(), endTime: newEndTime.getTime() });
            return { success: true };
          }

          case 'cancel': {
            await updateItem(item.id, { status: 'cancelled' });
            return { success: true };
          }

          default:
            return { success: false, error: isZh ? '未知操作类型' : 'Unknown action type' };
        }
      } catch (error) {
        console.error('Failed to execute action:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [allItems, updateItem, addItem, locale]
  );

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isProcessing) return;

      const userMessage: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        content: inputValue.trim(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setIsProcessing(true);

      const streamingMessage: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      setMessages(prev => [...prev, streamingMessage]);

      try {
        const result: QueryResult = await processQuery(userMessage.content, {
          items: allItems,
          locale,
          isAIConfigured: isAIConfigured === true,
        });

        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamingMessage.id
              ? { ...msg, content: result.content, proposal: result.proposal, actions: result.actions, isStreaming: false }
              : msg
          )
        );
      } catch (error) {
        console.error('Failed to process message:', error);
        const isZh = locale.startsWith('zh');
        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamingMessage.id
              ? { ...msg, content: isZh ? '抱歉，处理时出现了错误。请稍后再试。' : 'Sorry, an error occurred. Please try again.', isStreaming: false }
              : msg
          )
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [inputValue, isProcessing, allItems, locale, isAIConfigured]
  );

  const approveAction = useCallback(
    async (messageId: string) => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const isZh = locale.startsWith('zh');

      if (message.actions && message.actions.length > 0) {
        const results = await Promise.all(message.actions.map(action => executeAction(action)));
        const allSuccess = results.every(r => r.success);

        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                content: msg.content + `\n\n${allSuccess ? '✅' : '❌'} ${isZh ? '操作已完成' : 'Action completed'}`,
                actions: undefined,
              };
            }
            return msg;
          })
        );
        return;
      }

      if (!message.proposal) return;

      const item = allItems.find(i => i.id === message.proposal?.itemId);
      if (!item) return;

      if (item.type === 'idea') {
        const suggestion = smartScheduler.findBestTimeSlot(
          60,
          {
            preferredDate: item.metadata.extractedDate,
            preferredTime: item.metadata.extractedTime,
            avoidWeekends: true,
          },
          allItems
        );
        await toEvent(item.id, suggestion.suggestedStart.getTime(), suggestion.suggestedEnd.getTime());
      }

      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId && msg.proposal) {
            return {
              ...msg,
              content: msg.content + `\n\n✅ ${isZh ? '已批准此安排' : 'Approved'}`,
              proposal: undefined,
            };
          }
          return msg;
        })
      );
    },
    [messages, allItems, toEvent, executeAction, locale]
  );

  return {
    messages,
    inputValue,
    isProcessing,
    messagesEndRef,
    setInputValue,
    sendMessage,
    approveAction,
  };
}
