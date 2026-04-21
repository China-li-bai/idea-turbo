import { useState, useRef, useEffect, useCallback } from 'react';
import { useUnifiedItems } from '@/lib/hooks/useUnifiedItems';
import { smartScheduler } from '@/lib/services/smartScheduler';
import { db } from '@/lib/storage';
import {
  processQuery,
  type ProposalData,
  type ProposalAction,
  type QueryResult,
} from '@/lib/services/secretaryQueryProcessor';

export interface TimeSlot {
  startTime: number;
  endTime: number;
  label: string;
  isRecommended?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposal?: ProposalData;
  actions?: ProposalAction[];
  isStreaming?: boolean;
  timestamp?: number;
  timeSlots?: TimeSlot[];
}

const CHAT_KEY = 'secretary_messages';
const MAX_MESSAGES = 200;

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

async function loadMessages(): Promise<ChatMessage[]> {
  try {
    const saved = await db.chat.getItem<ChatMessage[]>(CHAT_KEY);
    if (saved && Array.isArray(saved)) {
      return saved.filter(m => !m.isStreaming);
    }
  } catch (e) {
    console.warn('[Chat] Failed to load messages:', e);
  }
  return [];
}

async function saveMessages(messages: ChatMessage[]): Promise<void> {
  try {
    const toSave = messages
      .filter(m => !m.isStreaming)
      .slice(-MAX_MESSAGES);
    await db.chat.setItem(CHAT_KEY, toSave);
  } catch (e) {
    console.warn('[Chat] Failed to save messages:', e);
  }
}

export function useSecretaryChat(
  locale: string,
  isAIConfigured: boolean | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { items: allItems, toEvent, createEvent, update } = useUnifiedItems();

  useEffect(() => {
    loadMessages().then(saved => {
      if (saved.length > 0) {
        setMessages(saved);
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, isLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeAction = useCallback(
    async (action: ProposalAction): Promise<{ success: boolean; error?: string }> => {
      const isZh = locale.startsWith('zh');

      try {
        if (action.type === 'create') {
          const { startTime, endTime, priority, description } = action.params;
          await createEvent(
            action.targetTitle,
            startTime as number,
            endTime as number,
            {
              priority: priority as 'high' | 'medium' | 'low',
              description: description as string,
            }
          );
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
            await update(item.id, { startTime: newStartTime.getTime(), endTime: newEndTime.getTime() });
            return { success: true };
          }

          case 'cancel': {
            await update(item.id, { status: 'cancelled' });
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
    [allItems, update, createEvent, locale]
  );

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isProcessing) return;

      const userMessage: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        content: inputValue.trim(),
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setIsProcessing(true);

      const streamingMessage: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: Date.now(),
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
              ? { ...msg, content: result.content, proposal: result.proposal, actions: result.actions, timeSlots: result.timeSlots, isStreaming: false }
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

  const clearHistory = useCallback(async () => {
    setMessages([]);
    await db.chat.removeItem(CHAT_KEY);
  }, []);

  const selectTimeSlot = useCallback(
    async (messageId: string, slotIndex: number) => {
      const message = messages.find(m => m.id === messageId);
      if (!message?.timeSlots || !message.actions) return;

      const slot = message.timeSlots[slotIndex];
      if (!slot) return;

      const updatedActions = message.actions.map(action => ({
        ...action,
        params: {
          ...action.params,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        afterPreview: new Date(slot.startTime).toLocaleString(locale, {
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

      const isZh = locale.startsWith('zh');
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              actions: updatedActions,
              content: msg.content.replace(
                /Time:.*/g,
                `${isZh ? '时间' : 'Time'}: ${new Date(slot.startTime).toLocaleString(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              ),
              timeSlots: msg.timeSlots?.map((s, i) => ({ ...s, isRecommended: i === slotIndex })),
            };
          }
          return msg;
        })
      );
    },
    [messages, locale]
  );

  return {
    messages,
    inputValue,
    isProcessing,
    isLoaded,
    messagesEndRef,
    setInputValue,
    sendMessage,
    approveAction,
    clearHistory,
    selectTimeSlot,
  };
}
