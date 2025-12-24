/**
 * 运行Supabase测试脚本
 * 使用dotenv加载环境变量
 */

const { execSync } = require('child_process');
const { config } = require('dotenv');
const { existsSync } = require('fs');

// 加载环境变量
config();

console.log('🚀 开始运行Supabase测试...\n');

// 检查必要的环境变量
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 缺少必要的环境变量:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n请检查.env文件是否包含这些变量。');
  process.exit(1);
}

// 检查必要文件
const requiredFiles = [
  'src/services/UnifiedDataAccess.ts',
  'src/services/UnifiedDataAccess.supabase.test.ts',
  '.env'
];

console.log('📋 检查必要文件...');
requiredFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.error(`❌ ${file}`);
    process.exit(1);
  }
});

console.log('\n📊 环境变量:');
console.log(`   SUPABASE_URL: ${process.env.VITE_SUPABASE_URL}`);
console.log(`   SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '已设置' : '未设置'}`);

try {
  console.log('\n🧪 运行Supabase测试...\n');
  
  // 运行测试
  execSync('npx vitest run src/services/UnifiedDataAccess.supabase.test.ts --reporter=verbose', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ Supabase测试完成!');
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  process.exit(1);
}