#!/usr/bin/env node

/**
 * Supabase连接测试脚本
 * 
 * 专门用于测试远程Supabase连接和基本CRUD操作
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量或配置文件获取Supabase配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少Supabase配置，请设置VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY环境变量');
  process.exit(1);
}

console.log('🔗 开始测试Supabase连接...');
console.log(`URL: ${SUPABASE_URL}`);

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试数据
const testUserId = `test_user_${Date.now()}`;
const testUser = {
  id: testUserId,
  email: `test_${Date.now()}@example.com`,
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  avatar_color: '#FF5733',
  subscription_type: 'free',
  subscription_started_at: new Date().toISOString(),
  preferred_session_duration: 25,
  daily_goal: 50,
  total_study_time: 120,
  current_streak: 5,
  longest_streak: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function testConnection() {
  try {
    console.log('\n📡 测试基本连接...');
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 连接成功！');
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    return false;
  }
}

async function testInsert() {
  try {
    console.log('\n➕ 测试插入数据...');
    const { data, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 插入成功！');
    console.log(`用户ID: ${data.id}`);
    console.log(`用户邮箱: ${data.email}`);
    return data;
  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    return null;
  }
}

async function testSelect(userId) {
  try {
    console.log('\n🔍 测试查询数据...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 查询成功！');
    console.log(`用户邮箱: ${data.email}`);
    console.log(`订阅类型: ${data.subscription_type}`);
    return data;
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    return null;
  }
}

async function testUpdate(userId) {
  try {
    console.log('\n✏️ 测试更新数据...');
    const newDisplayName = 'Updated Test User';
    const { data, error } = await supabase
      .from('users')
      .update({ 
        display_name: newDisplayName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 更新成功！');
    console.log(`新显示名: ${data.display_name}`);
    return data;
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    return null;
  }
}

async function testUserUsageStats(userId) {
  try {
    console.log('\n📊 测试用户使用统计...');
    
    // 插入用户使用统计
    const statsData = {
      id: `stats_${userId}`,
      user_id: userId,
      deck_count: 3,
      card_count: 50,
      deck_limit: 5,
      card_limit: 100,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_usage_stats')
      .insert(statsData)
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('✅ 用户使用统计插入成功！');
    console.log(`卡组数量: ${insertData.deck_count}`);
    console.log(`卡片数量: ${insertData.card_count}`);
    
    // 查询用户限制视图
    const { data: viewData, error: viewError } = await supabase
      .from('user_limits')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (viewError) {
      console.warn('⚠️ 无法查询用户限制视图:', viewError.message);
    } else {
      console.log('✅ 用户限制视图查询成功！');
      console.log(`卡组限制: ${viewData.deck_limit}`);
      console.log(`卡片限制: ${viewData.card_limit}`);
      console.log(`卡组限制是否达到: ${viewData.deck_limit_reached}`);
      console.log(`卡片限制是否达到: ${viewData.card_limit_reached}`);
    }
    
    return insertData;
  } catch (error) {
    console.error('❌ 用户使用统计测试失败:', error.message);
    return null;
  }
}

async function testDelete(userId) {
  try {
    console.log('\n🗑️ 测试删除数据...');
    
    // 删除用户使用统计
    const { error: statsError } = await supabase
      .from('user_usage_stats')
      .delete()
      .eq('user_id', userId);
    
    if (statsError) {
      console.warn('⚠️ 删除用户使用统计失败:', statsError.message);
    }
    
    // 删除用户
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 删除成功！');
    return true;
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('=====================================');
  console.log('🧪 Supabase连接测试开始');
  console.log('=====================================');
  
  // 测试连接
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('\n❌ 无法连接到Supabase，测试终止');
    process.exit(1);
  }
  
  // 测试插入
  const insertedUser = await testInsert();
  if (!insertedUser) {
    console.error('\n❌ 插入测试失败，测试终止');
    process.exit(1);
  }
  
  // 测试查询
  await testSelect(insertedUser.id);
  
  // 测试更新
  await testUpdate(insertedUser.id);
  
  // 测试用户使用统计
  await testUserUsageStats(insertedUser.id);
  
  // 测试删除
  await testDelete(insertedUser.id);
  
  console.log('\n=====================================');
  console.log('🎉 所有测试完成！');
  console.log('=====================================');
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试过程中发生错误:', error);
  process.exit(1);
});