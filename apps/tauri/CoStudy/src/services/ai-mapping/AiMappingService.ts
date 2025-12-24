import { createSimpleLLMManager } from '@make-gold/llm-adapter';
import { CsvRow, FieldMapping, AiMappingResult, ImportMode } from './types';

export class AiMappingService {
  private manager: any = null;

  constructor() {
    this.initializeManager();
  }

  private async initializeManager() {
    try {
      const apiKey = import.meta.env.VITE_GLM_API_KEY || '';
      if (!apiKey) {
        console.warn('GLM API key not provided. AI mapping functionality will be limited.');
        this.manager = null;
        return;
      }
      
      this.manager = createSimpleLLMManager([{
        type: 'glm',
        config: {
          apiKey: apiKey,
          baseURL: import.meta.env.VITE_GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/'
        }
      }]);
    } catch (error) {
      console.error('Failed to initialize AI manager:', error);
      this.manager = null;
    }
  }

  async performAiMapping(
    csvRows: CsvRow[],
    importMode: ImportMode,
    availableFields: string[]
  ): Promise<AiMappingResult> {
    if (!this.manager) {
      await this.initializeManager();
    }

    if (!this.manager) {
      return {
        success: false,
        error: 'AI服务初始化失败'
      };
    }

    if (!csvRows || csvRows.length === 0) {
      return {
        success: false,
        error: '没有可用的CSV数据'
      };
    }

    try {
      // 获取CSV列名
      const csvColumns = Object.keys(csvRows[0]);
      
      // 构建提示词
      const prompt = this.buildPrompt(csvColumns, importMode, availableFields, csvRows.slice(0, 5));
      
      // 定义JSON Schema用于结构化输出
      const jsonSchema = {
        name: "field_mapping",
        description: "CSV列到目标字段的映射结果",
        schema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: true
        }
      };
      
      // 为每个CSV列添加到schema中
      csvColumns.forEach(col => {
        jsonSchema.schema.properties[col] = {
          type: "string",
          description: `${col}列映射到的目标字段名`
        };
      });
      
      // 调用AI服务，使用结构化输出
      const response = await this.manager.complete({
        messages: [
          {
            role: 'system',
            content: '你是一个专业的数据映射助手，帮助用户将CSV列映射到目标字段。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        maxTokens: 2000,
        response_format: {
          type: 'json_object',
          json_schema: jsonSchema
        }
      });

      // 解析响应
      if (!response || !response.choices || response.choices.length === 0) {
        console.error('Invalid AI response:', response);
        return {
          success: false,
          error: 'AI服务返回了无效的响应'
        };
      }
      
      const content = response.choices[0].message?.content;
      if (!content) {
        console.error('No content in AI response:', response);
        return {
          success: false,
          error: 'AI服务返回了空内容'
        };
      }
      
      // 由于使用了结构化输出，应该直接就是有效的JSON
      const mapping = JSON.parse(content);
      
      return {
        success: true,
        mapping
      };
    } catch (error) {
      console.error('AI mapping failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '映射过程中发生未知错误'
      };
    }
  }

  private buildPrompt(
    csvColumns: string[],
    importMode: ImportMode,
    availableFields: string[],
    sampleRows: CsvRow[]
  ): string {
    const modeText = importMode === 'flashcard' ? '闪卡' : '词汇';
    
    // 根据导入模式定义必填字段
    const requiredFields = importMode === 'flashcard' 
      ? ['front', 'back'] 
      : ['word', 'meaning_zh'];
    
    // 字段显示名称映射
    const fieldDisplayNames: { [key: string]: string } = {
      // 闪卡字段
      front: '正面',
      back: '背面',
      question: '问题',
      answer: '答案',
      tags: '标签',
      notes: '笔记',
      
      // 词汇字段
      word: '单词',
      meaning_zh: '中文释义',
      meaning_en: '英文释义',
      part_of_speech: '词性',
      example_zh: '中文例句',
      example_en: '英文例句',
      synonyms: '同义词',
      antonyms: '反义词',
      language_code: '语言代码',
      difficulty_level: '难度等级',
      frequency_rank: '词频排名',
      ipa_pronunciation: 'IPA音标',
      audio_url: '音频链接',
      accent: '口音',
      etymology: '词源',
      mnemonic: '记忆法',
      ignore: '忽略'
    };
    
    let prompt = `我需要将CSV文件中的列映射到${modeText}导入系统的字段。

CSV列名：
${csvColumns.map(col => `- ${col}`).join('\n')}

可用的目标字段：
${availableFields.map(field => `- ${field} (${fieldDisplayNames[field] || field})`).join('\n')}

必填字段（必须映射）：
${requiredFields.map(field => `- ${field} (${fieldDisplayNames[field] || field})`).join('\n')}

CSV示例数据：
${sampleRows.map((row, index) => 
  `行${index + 1}: ${Object.entries(row).map(([key, value]) => `${key}="${value}"`).join(', ')}`
).join('\n')}

请分析CSV列名和示例数据，将每个CSV列映射到最合适的目标字段。

重要规则：
1. 必须确保所有必填字段都有对应的映射
2. 优先考虑列名的语义和示例数据的实际内容
3. 如果有多个可能的映射，选择最匹配的一个
4. 如果某列没有合适的匹配项，可以映射为"ignore"

请返回一个JSON对象，其中键是CSV列名，值是对应的目标字段名。`;

    return prompt;
  }

  private parseMappingResponse(response: string): FieldMapping {
    if (!response || typeof response !== 'string') {
      console.error('Invalid response for parsing:', response);
      return {};
    }
    
    try {
      // 尝试直接解析JSON
      return JSON.parse(response);
    } catch (error) {
      // 如果直接解析失败，尝试提取JSON部分
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e);
      }
      
      console.error('Failed to parse AI response as JSON:', response);
      return {};
    }
  }
}