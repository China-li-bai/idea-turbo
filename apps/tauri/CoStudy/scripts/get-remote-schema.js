/**
 * 获取远程数据库结构的脚本
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

async function getRemoteSchema() {
  try {
    // 获取所有表
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_all_tables');

    if (tablesError) {
      console.error('获取表列表失败:', tablesError);
      
      // 备用方法：查询information_schema
      const { data: schemaTables, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .neq('table_name', '_prisma_migrations');

      if (schemaError) {
        console.error('获取schema表失败:', schemaError);
        return;
      }

      console.log('远程数据库表列表:');
      console.log(JSON.stringify(schemaTables, null, 2));
      
      // 获取每个表的列信息
      for (const table of schemaTables) {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .order('ordinal_position');

        if (columnsError) {
          console.error(`获取表 ${table.table_name} 的列信息失败:`, columnsError);
          continue;
        }

        console.log(`\n表 ${table.table_name} 的列信息:`);
        console.log(JSON.stringify(columns, null, 2));
      }
    } else {
      console.log('远程数据库表列表:');
      console.log(JSON.stringify(tables, null, 2));
    }
  } catch (error) {
    console.error('获取远程数据库结构失败:', error);
  }
}

getRemoteSchema();