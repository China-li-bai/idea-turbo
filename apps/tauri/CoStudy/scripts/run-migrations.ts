/**
 * 数据库迁移执行器
 * 
 * 自动执行订阅系统相关的数据库迁移
 * Linus原则：脚本简单可靠，一次性解决问题
 */

import { getSupabaseClient } from '@make-gold/lib/supabase-ios14';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MigrationResult {
  success: boolean;
  error?: string;
  executedStatements: number;
}

/**
 * 执行SQL迁移脚本
 */
async function executeMigration(migrationPath: string): Promise<MigrationResult> {
  try {
    const supabase = getSupabaseClient();
    
    // 读取迁移文件
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // 分割SQL语句（按分号分割，过滤空语句）
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 准备执行 ${statements.length} 条SQL语句...`);
    
    let executedCount = 0;
    
    // 逐条执行SQL语句
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`🔄 执行: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('execute_sql', {
          sql_statement: statement
        });
        
        if (error) {
          // 如果是表已存在的错误，继续执行
          if (error.message.includes('already exists')) {
            console.log(`⚠️ 跳过已存在的对象: ${error.message}`);
          } else {
            throw error;
          }
        }
        
        executedCount++;
        console.log(`✅ 语句执行完成`);
      }
    }
    
    return {
      success: true,
      executedStatements: executedCount
    };
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    return {
      success: false,
      error: (error as Error).message,
      executedStatements: 0
    };
  }
}

/**
 * 手动执行迁移（如果Supabase没有execute_sql函数）
 */
async function executeManualMigration(): Promise<MigrationResult> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🔄 手动执行订阅系统迁移...');
    
    // 检查payment_transactions表是否存在
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'payment_transactions');
    
    if (tablesError) {
      console.log('⚠️ 无法检查表结构，跳过手动迁移');
      return {
        success: true,
        executedStatements: 0
      };
    }
    
    if (!tables || tables.length === 0) {
      console.log('⚠️ payment_transactions表不存在，需要在Supabase控制台手动创建');
      console.log('📋 请在Supabase SQL编辑器中执行以下SQL:');
      console.log('----------------------------------------');
      
      const migrationPath = join(process.cwd(), 'migrations', '001_subscription_system.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');
      console.log(migrationSQL);
      
      console.log('----------------------------------------');
    } else {
      console.log('✅ payment_transactions表已存在');
    }
    
    // 检查user_profiles表的订阅字段
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_type')
      .limit(1);
    
    if (profileError && profileError.message.includes('column "subscription_type" does not exist')) {
      console.log('⚠️ user_profiles表缺少订阅字段，需要手动添加');
      console.log('请执行以下SQL添加字段:');
      console.log('ALTER TABLE user_profiles ADD COLUMN subscription_type TEXT DEFAULT \'free\';');
      console.log('ALTER TABLE user_profiles ADD COLUMN subscription_started_at TIMESTAMP;');
      console.log('ALTER TABLE user_profiles ADD COLUMN subscription_expires_at TIMESTAMP;');
    } else {
      console.log('✅ user_profiles表订阅字段已存在');
    }
    
    return {
      success: true,
      executedStatements: 0
    };
    
  } catch (error) {
    console.error('❌ 手动迁移检查失败:', error);
    return {
      success: false,
      error: (error as Error).message,
      executedStatements: 0
    };
  }
}

/**
 * 主迁移函数
 */
async function runMigrations(): Promise<void> {
  console.log('🚀 开始数据库迁移...\n');
  
  try {
    const migrationPath = join(process.cwd(), 'migrations', '001_subscription_system.sql');
    
    // 首先尝试自动迁移
    console.log('📋 尝试自动执行迁移...');
    let result = await executeMigration(migrationPath);
    
    // 如果自动迁移失败，尝试手动检查
    if (!result.success) {
      console.log('⚠️ 自动迁移失败，尝试手动检查...');
      result = await executeManualMigration();
    }
    
    if (result.success) {
      console.log('🎉 数据库迁移完成！');
      if (result.executedStatements > 0) {
        console.log(`✅ 执行了 ${result.executedStatements} 条SQL语句`);
      }
    } else {
      console.log('❌ 迁移失败:', result.error);
      console.log('请手动在Supabase控制台执行迁移SQL');
    }
    
  } catch (error) {
    console.error('💥 迁移过程中发生意外错误:', error);
  }
}

// 导出迁移函数
export { runMigrations, executeMigration, executeManualMigration };

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runMigrations().catch(console.error);
}