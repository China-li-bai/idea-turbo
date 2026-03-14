import { aiService } from '@/lib/ai';

export interface ShiftNlpResult {
  action: 'query' | 'update' | 'delete' | 'add';
  confidence: number;
  criteria: {
    employeeName?: string;
    shiftName?: string;
    date?: Date;
    dateRange?: { start: Date; end: Date };
  };
  updates?: {
    employeeId?: string;
    shiftTypeId?: string;
    date?: Date;
  };
  rawInput: string;
}

const SYSTEM_PROMPT = `你是一个智能排班助手，负责解析用户的自然语言指令。

请将用户的指令解析为JSON格式，包含以下字段：
- action: 操作类型，只能是 "query"（查询）、"update"（修改）、"delete"（删除）、"add"（添加）
- confidence: 置信度，0-1之间的数字，表示你对解析结果的信心
- criteria: 搜索条件，可以包含：
  - employeeName: 员工姓名（字符串）
  - shiftName: 班次名称，如"早班"、"晚班"、"夜班"、"中班"等（字符串）
  - date: 日期，格式为YYYY-MM-DD（字符串）
- updates: 修改内容（仅当action为update时需要）

示例：
输入："查询张三的排班"
输出：{"action":"query","confidence":0.95,"criteria":{"employeeName":"张三"}}

输入："查看明天的早班"
输出：{"action":"query","confidence":0.9,"criteria":{"shiftName":"早班","date":"2024-03-15"}}

输入："删除下周一的晚班"
输出：{"action":"delete","confidence":0.92,"criteria":{"shiftName":"晚班","date":"2024-03-18"}}

输入："修改李四的夜班"
输出：{"action":"update","confidence":0.88,"criteria":{"employeeName":"李四","shiftName":"夜班"}}

注意：
1. 只返回JSON，不要有其他文本
2. 日期使用YYYY-MM-DD格式
3. 如果无法确定某个字段，可以省略
4. 置信度要合理，不确定的话给低一些`;

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

export async function parseShiftNlp(input: string): Promise<ShiftNlpResult> {
  const defaultResult: ShiftNlpResult = {
    action: 'query',
    confidence: 0.5,
    criteria: {},
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

    const result: ShiftNlpResult = {
      action: parsed.action || 'query',
      confidence: parsed.confidence || 0.5,
      criteria: {},
      rawInput: input,
    };

    if (parsed.criteria) {
      if (parsed.criteria.employeeName) {
        result.criteria.employeeName = parsed.criteria.employeeName;
      }
      if (parsed.criteria.shiftName) {
        result.criteria.shiftName = parsed.criteria.shiftName;
      }
      if (parsed.criteria.date) {
        const date = parseDateFromString(parsed.criteria.date);
        if (date) {
          result.criteria.date = date;
        }
      }
    }

    if (parsed.updates) {
      result.updates = parsed.updates;
    }

    return result;
  } catch (error) {
    console.error('AI解析失败:', error);
    return defaultResult;
  }
}

export function formatShiftNlpResult(result: ShiftNlpResult): string {
  const actionText: Record<ShiftNlpResult['action'], string> = {
    query: '查询',
    update: '修改',
    delete: '删除',
    add: '添加',
  };

  let description = `${actionText[result.action]}排班`;
  const parts: string[] = [];

  if (result.criteria.employeeName) {
    parts.push(`员工：${result.criteria.employeeName}`);
  }
  if (result.criteria.shiftName) {
    parts.push(`班次：${result.criteria.shiftName}`);
  }
  if (result.criteria.date) {
    parts.push(`日期：${result.criteria.date.toLocaleDateString('zh-CN')}`);
  }

  if (parts.length > 0) {
    description += `（${parts.join('，')}）`;
  }

  description += `（置信度：${(result.confidence * 100).toFixed(0)}%）`;

  return description;
}
