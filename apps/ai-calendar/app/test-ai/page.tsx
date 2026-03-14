'use client';

import { useState } from 'react';
import {
  smartRecommendationService,
  smartReminderService,
  conflictResolutionService,
  unifiedDataService,
  vectorService,
} from '@/lib/services';
import { eventBus } from '@/lib/utils/eventBus';
import type { CalendarEvent } from '@/types';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
  details?: any;
}

export default function AIFunctionsTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testEvents, setTestEvents] = useState<CalendarEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults(prev =>
      prev.map(r => (r.name === name ? { ...r, ...updates } : r))
    );
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const generateId = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const createTestEvent = (
    title: string,
    startTime: Date,
    endTime: Date,
    location?: string,
    description?: string
  ): CalendarEvent => ({
    id: generateId(),
    title,
    startTime,
    endTime,
    location,
    description,
    color: '#3B82F6',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const testRecommendationBasic = async () => {
    const testName = '智能推荐-基础功能';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      await smartRecommendationService.initialize();
      const preferences = smartRecommendationService.getPreferences();
      
      if (!preferences) {
        throw new Error('用户偏好初始化失败');
      }

      const recommendation = await smartRecommendationService.recommendTimeSlots(
        '测试会议',
        60,
        {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      );

      if (!recommendation.recommendedSlots || recommendation.recommendedSlots.length === 0) {
        throw new Error('未生成推荐时间段');
      }

      updateResult(testName, {
        status: 'success',
        message: `成功生成 ${recommendation.recommendedSlots.length} 个推荐时间段`,
        duration: Date.now() - startTime,
        details: {
          preferences,
          topSlot: recommendation.recommendedSlots[0],
          insights: recommendation.insights,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testRecommendationWithConflict = async () => {
    const testName = '智能推荐-冲突检测';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const conflictEvent = createTestEvent(
        '冲突测试事件',
        new Date(now.getTime() + 2 * 60 * 60 * 1000),
        new Date(now.getTime() + 3 * 60 * 60 * 1000),
        '会议室A',
        '这是一个测试冲突的事件'
      );

      const createdEvent = await unifiedDataService.addEvent(conflictEvent);
      testEvents.push(createdEvent);
      setTestEvents([...testEvents]);

      await sleep(100);

      const recommendation = await smartRecommendationService.recommendTimeSlots(
        '新会议',
        60,
        {
          start: new Date(now.getTime() + 1.5 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 3.5 * 60 * 60 * 1000),
        }
      );

      const hasConflict = recommendation.conflicts.length > 0;

      if (!hasConflict) {
        throw new Error('未能检测到冲突');
      }

      const hasTargetConflict = recommendation.conflicts.some(
        c => c.event.id === createdEvent.id
      );

      if (!hasTargetConflict) {
        throw new Error('检测到的冲突不包含测试事件');
      }

      updateResult(testName, {
        status: 'success',
        message: `成功检测到与测试事件的冲突`,
        duration: Date.now() - startTime,
        details: {
          conflicts: recommendation.conflicts,
          conflictEvent: createdEvent,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testReminderBasic = async () => {
    const testName = '智能提醒-基础功能';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const testEvent = createTestEvent(
        '提醒测试事件',
        new Date(now.getTime() + 30 * 60 * 1000),
        new Date(now.getTime() + 60 * 60 * 1000),
        '会议室B',
        '这是一个测试提醒的事件'
      );

      const createdEvent = await unifiedDataService.addEvent(testEvent);
      testEvents.push(createdEvent);
      setTestEvents([...testEvents]);

      const importance = await smartReminderService.analyzeEventImportance(createdEvent);
      
      if (!importance || !importance.level) {
        throw new Error('事件重要性分析失败');
      }

      const reminder = await smartReminderService.calculateSmartReminder(createdEvent, importance);

      if (!reminder.shouldRemind) {
        throw new Error('应该触发提醒但未触发');
      }

      updateResult(testName, {
        status: 'success',
        message: `重要性: ${importance.level}, 提前 ${reminder.advanceTime} 分钟提醒`,
        duration: Date.now() - startTime,
        details: {
          importance,
          reminder,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testReminderCritical = async () => {
    const testName = '智能提醒-关键事件';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const criticalEvent = createTestEvent(
        '【紧急】重要客户会议',
        new Date(now.getTime() + 45 * 60 * 1000),
        new Date(now.getTime() + 105 * 60 * 1000),
        'VIP会议室',
        '这是一个非常紧急的重要会议，涉及重要客户'
      );

      const createdEvent = await unifiedDataService.addEvent(criticalEvent);
      testEvents.push(createdEvent);
      setTestEvents([...testEvents]);

      const importance = await smartReminderService.analyzeEventImportance(createdEvent);
      const reminder = await smartReminderService.calculateSmartReminder(createdEvent, importance);

      if (importance.level !== 'critical' && importance.level !== 'high') {
        throw new Error(`关键事件重要性应为 critical 或 high，实际为 ${importance.level}`);
      }

      if (reminder.advanceTime < 30) {
        throw new Error(`关键事件应至少提前30分钟提醒，实际为 ${reminder.advanceTime} 分钟`);
      }

      updateResult(testName, {
        status: 'success',
        message: `关键事件识别成功，重要性: ${importance.level}, 提前 ${reminder.advanceTime} 分钟`,
        duration: Date.now() - startTime,
        details: {
          importance,
          reminder,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testConflictDetection = async () => {
    const testName = '冲突检测-基础功能';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const baseTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      const event1 = createTestEvent(
        '冲突事件1',
        baseTime,
        new Date(baseTime.getTime() + 60 * 60 * 1000),
        '会议室C'
      );

      const event2 = createTestEvent(
        '冲突事件2',
        new Date(baseTime.getTime() + 30 * 60 * 1000),
        new Date(baseTime.getTime() + 90 * 60 * 1000),
        '会议室C'
      );

      const created1 = await unifiedDataService.addEvent(event1);
      const created2 = await unifiedDataService.addEvent(event2);
      
      testEvents.push(created1, created2);
      setTestEvents([...testEvents]);

      await sleep(100);

      const conflicts = await conflictResolutionService.detectConflicts(
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      if (conflicts.length === 0) {
        throw new Error('未能检测到冲突');
      }

      const targetConflict = conflicts.find(
        c => (c.event1.id === created1.id && c.event2.id === created2.id) ||
             (c.event1.id === created2.id && c.event2.id === created1.id)
      );

      if (!targetConflict) {
        throw new Error('检测到的冲突不包含测试事件');
      }

      updateResult(testName, {
        status: 'success',
        message: `成功检测到 ${conflicts.length} 个冲突，重叠时长: ${Math.round(targetConflict.overlapDuration)} 分钟`,
        duration: Date.now() - startTime,
        details: {
          conflict: targetConflict,
          totalConflicts: conflicts.length,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testConflictResolution = async () => {
    const testName = '冲突解决-方案生成';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const baseTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      const event1 = createTestEvent(
        '解决测试事件1',
        baseTime,
        new Date(baseTime.getTime() + 60 * 60 * 1000),
        '会议室D'
      );

      const event2 = createTestEvent(
        '解决测试事件2',
        new Date(baseTime.getTime() + 30 * 60 * 1000),
        new Date(baseTime.getTime() + 90 * 60 * 1000),
        '会议室D'
      );

      const created1 = await unifiedDataService.addEvent(event1);
      const created2 = await unifiedDataService.addEvent(event2);
      
      testEvents.push(created1, created2);
      setTestEvents([...testEvents]);

      await sleep(100);

      const conflicts = await conflictResolutionService.detectConflicts(
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      const targetConflict = conflicts.find(
        c => (c.event1.id === created1.id && c.event2.id === created2.id) ||
             (c.event1.id === created2.id && c.event2.id === created1.id)
      );

      if (!targetConflict) {
        throw new Error('未找到测试冲突');
      }

      const resolution = await conflictResolutionService.resolveConflict(targetConflict);

      if (!resolution.options || resolution.options.length === 0) {
        throw new Error('未生成解决方案');
      }

      updateResult(testName, {
        status: 'success',
        message: `生成 ${resolution.options.length} 个解决方案，AI建议: ${resolution.aiSuggestion}`,
        duration: Date.now() - startTime,
        details: {
          resolution,
          options: resolution.options.map(o => ({
            type: o.type,
            description: o.description,
            impact: o.impact,
          })),
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testDataConsistency = async () => {
    const testName = '数据统一性-并发操作';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const baseTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

      const events = await Promise.all([
        unifiedDataService.addEvent(createTestEvent(
          '并发测试1',
          baseTime,
          new Date(baseTime.getTime() + 30 * 60 * 1000)
        )),
        unifiedDataService.addEvent(createTestEvent(
          '并发测试2',
          new Date(baseTime.getTime() + 40 * 60 * 1000),
          new Date(baseTime.getTime() + 70 * 60 * 1000)
        )),
        unifiedDataService.addEvent(createTestEvent(
          '并发测试3',
          new Date(baseTime.getTime() + 80 * 60 * 1000),
          new Date(baseTime.getTime() + 110 * 60 * 1000)
        )),
      ]);

      testEvents.push(...events);
      setTestEvents([...testEvents]);

      await sleep(200);

      const allEvents = await unifiedDataService.getAllEvents();
      const createdIds = events.map(e => e.id);
      const foundEvents = allEvents.filter(e => createdIds.includes(e.id));

      if (foundEvents.length !== events.length) {
        throw new Error(`数据不一致: 创建了 ${events.length} 个事件，但只找到 ${foundEvents.length} 个`);
      }

      const updatePromises = events.map((event, index) =>
        unifiedDataService.updateEvent(event.id, {
          title: `并发测试${index + 1}-已更新`,
        })
      );

      await Promise.all(updatePromises);

      await sleep(200);

      const updatedEvents = await unifiedDataService.getAllEvents();
      const updatedFound = updatedEvents.filter(e => createdIds.includes(e.id));

      const allUpdated = updatedFound.every(e => e.title.includes('已更新'));

      if (!allUpdated) {
        throw new Error('并发更新后数据不一致');
      }

      updateResult(testName, {
        status: 'success',
        message: `并发创建 ${events.length} 个事件，并发更新成功，数据一致性验证通过`,
        duration: Date.now() - startTime,
        details: {
          createdCount: events.length,
          foundCount: foundEvents.length,
          updatedCount: updatedFound.length,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testBoundaryEmpty = async () => {
    const testName = '边界条件-空数据';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const SmartRecommendationServiceClass = smartRecommendationService.constructor as any;
      const newService = new SmartRecommendationServiceClass();
      
      const preferences = await newService.learnUserPreferences();
      
      if (!preferences || !preferences.preferredHours) {
        throw new Error('空数据情况下应返回默认偏好');
      }

      const start = new Date();
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const recommendation = await newService.recommendTimeSlots('测试', 60, { start, end });

      if (!recommendation.recommendedSlots || recommendation.recommendedSlots.length === 0) {
        throw new Error('空数据情况下应能生成推荐');
      }

      updateResult(testName, {
        status: 'success',
        message: '空数据处理正确，返回默认偏好和推荐',
        duration: Date.now() - startTime,
        details: {
          preferences,
          slotsCount: recommendation.recommendedSlots.length,
          topSlot: recommendation.recommendedSlots[0],
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testBoundaryLargeData = async () => {
    const testName = '边界条件-大量数据';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      const events: CalendarEvent[] = [];

      for (let i = 0; i < 50; i++) {
        const dayOffset = Math.floor(i / 10);
        const hourOffset = (i % 10) * 2;
        
        events.push(createTestEvent(
          `批量测试事件${i + 1}`,
          new Date(now.getTime() + (dayOffset * 24 + hourOffset) * 60 * 60 * 1000),
          new Date(now.getTime() + (dayOffset * 24 + hourOffset + 1) * 60 * 60 * 1000)
        ));
      }

      const createdEvents = await Promise.all(
        events.map(e => unifiedDataService.addEvent(e))
      );

      testEvents.push(...createdEvents);
      setTestEvents([...testEvents]);

      await sleep(500);

      const recommendation = await smartRecommendationService.recommendTimeSlots(
        '新会议',
        60,
        {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      );

      if (!recommendation.recommendedSlots || recommendation.recommendedSlots.length === 0) {
        throw new Error('大量数据情况下推荐失败');
      }

      const conflicts = await conflictResolutionService.detectConflicts(
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      updateResult(testName, {
        status: 'success',
        message: `创建 ${createdEvents.length} 个事件，推荐成功，检测到 ${conflicts.length} 个冲突`,
        duration: Date.now() - startTime,
        details: {
          eventsCreated: createdEvents.length,
          recommendationsCount: recommendation.recommendedSlots.length,
          conflictsCount: conflicts.length,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testVectorSearch = async () => {
    const testName = '向量搜索-语义搜索';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      const now = new Date();
      
      const event1 = createTestEvent(
        '项目进度讨论会议',
        new Date(now.getTime() + 10 * 60 * 60 * 1000),
        new Date(now.getTime() + 11 * 60 * 60 * 1000),
        '会议室E',
        '讨论项目进度和下一步计划'
      );

      const event2 = createTestEvent(
        '团队建设活动',
        new Date(now.getTime() + 12 * 60 * 60 * 1000),
        new Date(now.getTime() + 14 * 60 * 60 * 1000),
        '户外',
        '团队户外拓展活动'
      );

      const created1 = await unifiedDataService.addEvent(event1);
      const created2 = await unifiedDataService.addEvent(event2);

      testEvents.push(created1, created2);
      setTestEvents([...testEvents]);

      await vectorService.indexEvent(created1);
      await vectorService.indexEvent(created2);

      await sleep(200);

      const results = await vectorService.search('会议讨论', { k: 5 });

      if (!results || results.length === 0) {
        throw new Error('向量搜索未返回结果');
      }

      const hasMeetingResult = results.some(
        r => r.originalId === created1.id
      );

      if (!hasMeetingResult) {
        throw new Error('向量搜索未找到相关会议');
      }

      updateResult(testName, {
        status: 'success',
        message: `搜索"会议讨论"返回 ${results.length} 个结果，相关度最高: ${results[0]?.title}`,
        duration: Date.now() - startTime,
        details: {
          query: '会议讨论',
          results: results.map(r => ({
            title: r.title,
            score: r.score,
          })),
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const testEventBusSync = async () => {
    const testName = '数据统一性-事件总线同步';
    const startTime = Date.now();
    
    addResult({ name: testName, status: 'running', message: '测试中...' });
    
    try {
      let eventReceived = false;
      let receivedData: any = null;

      const unsubscribe = eventBus.subscribeAll((event) => {
        if (event.type === 'created' && event.entityType === 'event') {
          eventReceived = true;
          receivedData = event;
        }
      });

      const now = new Date();
      const testEvent = createTestEvent(
        '事件总线测试',
        new Date(now.getTime() + 15 * 60 * 60 * 1000),
        new Date(now.getTime() + 16 * 60 * 60 * 1000)
      );

      const created = await unifiedDataService.addEvent(testEvent);
      testEvents.push(created);
      setTestEvents([...testEvents]);

      await sleep(100);

      unsubscribe();

      if (!eventReceived) {
        throw new Error('事件总线未触发事件');
      }

      if (receivedData?.entityId !== created.id) {
        throw new Error('事件总线数据不一致');
      }

      updateResult(testName, {
        status: 'success',
        message: '事件总线同步成功，数据一致性验证通过',
        duration: Date.now() - startTime,
        details: {
          eventReceived,
          eventId: created.id,
          receivedId: receivedData?.entityId,
        },
      });
    } catch (error: any) {
      updateResult(testName, {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime,
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    await testRecommendationBasic();
    await sleep(200);
    
    await testRecommendationWithConflict();
    await sleep(200);
    
    await testReminderBasic();
    await sleep(200);
    
    await testReminderCritical();
    await sleep(200);
    
    await testConflictDetection();
    await sleep(200);
    
    await testConflictResolution();
    await sleep(200);
    
    await testDataConsistency();
    await sleep(200);
    
    await testBoundaryEmpty();
    await sleep(200);
    
    await testBoundaryLargeData();
    await sleep(200);
    
    await testVectorSearch();
    await sleep(200);
    
    await testEventBusSync();

    setIsRunning(false);
  };

  const cleanupTestData = async () => {
    try {
      for (const event of testEvents) {
        await unifiedDataService.deleteEvent(event.id);
      }
      setTestEvents([]);
      alert('测试数据已清理');
    } catch (error: any) {
      alert('清理失败: ' + error.message);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        🧪 AI功能测试面板
      </h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#9CA3AF' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {isRunning ? '测试运行中...' : '▶️ 运行所有测试'}
        </button>

        <button
          onClick={testRecommendationBasic}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          智能推荐-基础
        </button>

        <button
          onClick={testRecommendationWithConflict}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          智能推荐-冲突
        </button>

        <button
          onClick={testReminderBasic}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          智能提醒-基础
        </button>

        <button
          onClick={testReminderCritical}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          智能提醒-关键
        </button>

        <button
          onClick={testConflictDetection}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          冲突检测
        </button>

        <button
          onClick={testConflictResolution}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          冲突解决
        </button>

        <button
          onClick={testDataConsistency}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#8B5CF6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          数据统一性
        </button>

        <button
          onClick={testBoundaryEmpty}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#EC4899',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          边界-空数据
        </button>

        <button
          onClick={testBoundaryLargeData}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#EC4899',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          边界-大量数据
        </button>

        <button
          onClick={testVectorSearch}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#06B6D4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          向量搜索
        </button>

        <button
          onClick={testEventBusSync}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#8B5CF6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          事件总线同步
        </button>

        <button
          onClick={cleanupTestData}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🗑️ 清理测试数据
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
            测试统计
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>总计: {results.length}</span>
            <span style={{ color: '#10B981' }}>✅ 成功: {successCount}</span>
            <span style={{ color: '#EF4444' }}>❌ 失败: {errorCount}</span>
            <span style={{ color: '#9CA3AF' }}>⏳ 待运行: {results.length - successCount - errorCount}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        {results.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '15px',
              backgroundColor:
                result.status === 'success' ? '#ECFDF5' :
                result.status === 'error' ? '#FEF2F2' :
                result.status === 'running' ? '#FEF3C7' : '#F9FAFB',
              border: '1px solid',
              borderColor:
                result.status === 'success' ? '#10B981' :
                result.status === 'error' ? '#EF4444' :
                result.status === 'running' ? '#F59E0B' : '#E5E7EB',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>
                {result.status === 'success' && '✅ '}
                {result.status === 'error' && '❌ '}
                {result.status === 'running' && '⏳ '}
                {result.name}
              </div>
              {result.duration && (
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {result.duration}ms
                </div>
              )}
            </div>
            <div style={{ fontSize: '14px', color: '#374151', marginBottom: result.details ? '10px' : '0' }}>
              {result.message}
            </div>
            {result.details && (
              <details style={{ fontSize: '13px' }}>
                <summary style={{ cursor: 'pointer', color: '#6B7280' }}>
                  查看详情
                </summary>
                <pre style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '300px',
                  fontSize: '12px',
                }}>
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {testEvents.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
          <div style={{ fontWeight: '600', marginBottom: '10px' }}>
            测试事件 ({testEvents.length})
          </div>
          <div style={{ fontSize: '13px', maxHeight: '200px', overflow: 'auto' }}>
            {testEvents.map((event, index) => (
              <div key={event.id} style={{ padding: '5px 0', borderBottom: '1px solid #E5E7EB' }}>
                {index + 1}. {event.title} - {event.startTime.toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
