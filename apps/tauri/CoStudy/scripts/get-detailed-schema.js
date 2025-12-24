/**
 * 获取远程数据库详细结构的脚本
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// 加载环境变量
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 基于schema.sql和schema-final.sql中定义的表
const existingTables = [
  'users',
  'user_usage_stats',
  'decks',
  'cards',
  'review_logs',
  'vocabulary_cards',
  'vocabulary_definitions',
  'vocabulary_synonyms',
  'vocabulary_antonyms',
  'study_sessions',
  'study_room_history',
  'activity_pulses',
  'achievements',
  'daily_stats'
];

async function getTableSchema(tableName) {
  try {
    console.log(`\n=== 表 ${tableName} 的详细结构 ===`);
    
    // 尝试查询表的一条记录来获取结构信息
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`表 ${tableName} 不存在或无权限访问:`, error.message);
      return null;
    }
    
    // 如果有数据，打印字段信息
    if (data && data.length > 0) {
      console.log(`字段列表:`);
      Object.keys(data[0]).forEach(key => {
        const value = data[0][key];
        const type = value !== null ? typeof value : 'null';
        console.log(`  - ${key}: ${type}`);
      });
    } else {
      console.log(`表 ${tableName} 为空，尝试插入一条临时记录来获取结构...`);
      
      // 尝试插入一条临时记录来获取结构
      const tempId = `temp-${Date.now()}`;
      let tempRecord = {};
      
      // 根据表名构建临时记录
      switch(tableName) {
        case 'users':
          tempRecord = { id: tempId, email: `temp-${tempId}@example.com` };
          break;
        case 'user_usage_stats':
          tempRecord = { id: tempId, user_id: tempId };
          break;
        case 'decks':
          tempRecord = { id: tempId, user_id: tempId, name: 'Temp Deck' };
          break;
        case 'cards':
          tempRecord = { id: tempId, user_id: tempId, deck_id: tempId, front: 'Front', back: 'Back' };
          break;
        case 'review_logs':
          tempRecord = { id: tempId, user_id: tempId, card_id: tempId, rating: 3 };
          break;
        case 'vocabulary_cards':
          tempRecord = { card_id: tempId, word: 'test', language_code: 'en' };
          break;
        case 'vocabulary_definitions':
          tempRecord = { id: tempId, card_id: tempId, part_of_speech: 'noun', meaning_en: 'test', meaning_zh: '测试' };
          break;
        case 'vocabulary_synonyms':
          tempRecord = { card_id: tempId, synonym: 'test' };
          break;
        case 'vocabulary_antonyms':
          tempRecord = { card_id: tempId, antonym: 'test' };
          break;
        case 'study_sessions':
          tempRecord = { id: tempId, user_id: tempId };
          break;
        case 'study_room_history':
          tempRecord = { id: tempId, user_id: tempId, room_id: tempId };
          break;
        case 'activity_pulses':
          tempRecord = { id: tempId, user_id: tempId, pulse_type: 'card_review' };
          break;
        case 'achievements':
          tempRecord = { id: tempId, user_id: tempId, achievement_type: 'test', achievement_name: 'Test Achievement' };
          break;
        case 'daily_stats':
          tempRecord = { id: tempId, user_id: tempId, stat_date: new Date().toISOString().split('T')[0] };
          break;
      }
      
      try {
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert(tempRecord)
          .select()
          .single();
        
        if (insertError) {
          console.error(`插入临时记录失败:`, insertError.message);
          return null;
        }
        
        console.log(`字段列表:`);
        Object.keys(insertData).forEach(key => {
          const value = insertData[key];
          const type = value !== null ? typeof value : 'null';
          console.log(`  - ${key}: ${type}`);
        });
        
        // 删除临时记录
        await supabase
          .from(tableName)
          .delete()
          .eq('id', tempId);
          
        console.log(`已删除临时记录`);
      } catch (e) {
        console.error(`获取表 ${tableName} 结构失败:`, e.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`获取表 ${tableName} 结构时出错:`, error.message);
    return null;
  }
}

async function compareSchemas() {
  try {
    console.log('开始获取远程数据库详细结构...\n');
    
    for (const tableName of existingTables) {
      await getTableSchema(tableName);
    }
    
  } catch (error) {
    console.error('获取远程数据库结构失败:', error);
  }
}

compareSchemas();