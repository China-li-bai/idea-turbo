/**
 * 获取远程数据库结构的脚本 - 第二版
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
const expectedTables = [
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
  'user_profiles',
  'study_room_history',
  'activity_pulses',
  'achievements',
  'daily_stats'
];

async function checkTableStructure(tableName) {
  try {
    console.log(`\n检查表 ${tableName} 的结构...`);
    
    // 尝试查询表的一条记录来获取结构信息
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`表 ${tableName} 不存在或无权限访问:`, error.message);
      return null;
    }

    console.log(`表 ${tableName} 存在`);
    
    // 如果有数据，打印字段信息
    if (data && data.length > 0) {
      console.log(`字段:`, Object.keys(data[0]));
    } else {
      console.log(`表 ${tableName} 为空，无法确定字段`);
    }
    
    return true;
  } catch (error) {
    console.error(`检查表 ${tableName} 时出错:`, error.message);
    return null;
  }
}

async function getRemoteSchema() {
  try {
    console.log('开始检查远程数据库结构...\n');
    
    const existingTables = [];
    const missingTables = [];
    
    for (const tableName of expectedTables) {
      const exists = await checkTableStructure(tableName);
      if (exists === true) {
        existingTables.push(tableName);
      } else {
        missingTables.push(tableName);
      }
    }
    
    console.log('\n=== 数据库结构对比结果 ===');
    console.log(`存在的表 (${existingTables.length}):`);
    existingTables.forEach(table => console.log(`  ✓ ${table}`));
    
    if (missingTables.length > 0) {
      console.log(`\n缺失的表 (${missingTables.length}):`);
      missingTables.forEach(table => console.log(`  ✗ ${table}`));
    }
    
    // 检查关键表是否包含user_id字段
    console.log('\n=== 检查关键表的user_id字段 ===');
    const keyTables = ['users', 'decks', 'cards', 'review_logs'];
    
    for (const tableName of keyTables) {
      if (existingTables.includes(tableName)) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('user_id')
            .limit(1);
          
          if (error) {
            console.log(`表 ${tableName}: 无法检查user_id字段 - ${error.message}`);
          } else {
            console.log(`表 ${tableName}: 包含user_id字段 ✓`);
          }
        } catch (e) {
          console.log(`表 ${tableName}: 检查user_id字段时出错`);
        }
      }
    }
    
  } catch (error) {
    console.error('获取远程数据库结构失败:', error);
  }
}

getRemoteSchema();