import { aiService } from '@/lib/ai';

export interface ParsedResult {
  title: string;
  date?: Date;
  time?: string;
  duration?: number;
  location?: string;
  type: 'todo' | 'event' | 'note';
  people?: string[];
  description?: string;
  confidence: number;
  rawInput: string;
}

const SYSTEM_PROMPT = `你是一个智能日程助手，负责解析用户的自然语言输入并提取关键信息。

请将用户的输入解析为JSON格式，包含以下字段：
- title: 事件标题（简洁明了）
- date: 日期，格式为YYYY-MM-DD（字符串）
- time: 时间，格式为HH:MM（字符串）
- duration: 持续时间，单位分钟（数字）
- location: 地点（字符串）
- type: 类型，只能是 "todo"（待办）、"event"（日程）、"note"（笔记）
- people: 相关人员数组
- description: 详细描述
- confidence: 置信度，0-1之间的数字

示例：
输入："下周二下午3点见王总，讨论Q3计划"
输出：{
  "title": "与王总会议",
  "date": "2024-03-19",
  "time": "15:00",
  "duration": 60,
  "type": "event",
  "people": ["王总"],
  "description": "讨论Q3计划",
  "confidence": 0.95
}

输入："记得买牛奶"
输出：{
  "title": "购买牛奶",
  "type": "todo",
  "confidence": 0.9
}

输入："今天学到了React的新特性"
输出：{
  "title": "学习React新特性",
  "type": "note",
  "description": "今天学到了React的新特性",
  "confidence": 0.85
}

注意：
1. 只返回JSON，不要有其他文本
2. 日期使用YYYY-MM-DD格式
3. 时间使用24小时制HH:MM格式
4. 如果无法确定某个字段，可以省略
5. 置信度要合理，不确定的话给低一些
6. 标题要简洁明了，不要包含时间地点等信息`;

function parseDateFromString(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function parseNaturalLanguage(input: string): Promise<ParsedResult> {
  const defaultResult: ParsedResult = {
    title: input.trim(),
    type: 'event',
    confidence: 0.5,
    rawInput: input,
  };

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const response = await aiService.chat([
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `今天是${todayStr}。用户输入：${input}`,
      },
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return defaultResult;
    }

    let parsed: any;
    try {
      let cleanedContent = content.trim();
      
      cleanedContent = cleanedContent
        .replace(/^```[\s\S]*?\n/, '')
        .replace(/```$/, '')
        .trim();
      
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON解析失败，使用默认解析:', parseError);
      return defaultResult;
    }

    const result: ParsedResult = {
      title: parsed.title || input.trim(),
      type: parsed.type || 'event',
      confidence: parsed.confidence || 0.5,
      rawInput: input,
    };

    if (parsed.date) {
      const date = parseDateFromString(parsed.date);
      if (date) {
        result.date = date;
      }
    }

    if (parsed.time) {
      result.time = parsed.time;
      
      if (result.date && parsed.time) {
        const [hours, minutes] = parsed.time.split(':').map(Number);
        result.date = new Date(
          result.date.getFullYear(),
          result.date.getMonth(),
          result.date.getDate(),
          hours || 0,
          minutes || 0
        );
      }
    }

    if (parsed.duration) {
      result.duration = parsed.duration;
    }

    if (parsed.location) {
      result.location = parsed.location;
    }

    if (parsed.people && Array.isArray(parsed.people)) {
      result.people = parsed.people;
    }

    if (parsed.description) {
      result.description = parsed.description;
    }

    return result;
  } catch (error) {
    console.error('AI解析失败:', error);
    return defaultResult;
  }
}

export function formatTimeRange(start: Date, end: Date): string {
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();
  
  const formatHour = (h: number) => {
    if (h >= 12) {
      return `下午${h === 12 ? 12 : h - 12}`;
    }
    return `上午${h === 0 ? 12 : h}`;
  };
  
  return `${formatHour(startHour)}:${startMinute.toString().padStart(2, '0')} - ${formatHour(endHour)}:${endMinute.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays === 2) return '后天';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}天后`;
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
