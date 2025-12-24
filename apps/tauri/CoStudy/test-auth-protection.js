/**
 * 测试认证保护是否生效
 * 验证未登录用户无法访问远程数据
 */

// 简单测试：导入我们的认证保护模块
try {
  // 模拟未登录状态
  const { getDataAccessStrategyService } = require('./src/services/DataAccessStrategyService.ts');
  
  console.log('✓ 认证保护模块导入成功');
  
  // 测试策略服务是否能正确判断访问权限
  async function testAuthProtection() {
    const strategyService = getDataAccessStrategyService();
    
    // 未登录用户应该无法访问远程数据
    const canAccess = await strategyService.canAccessRemoteData();
    
    if (!canAccess) {
      console.log('✓ 未登录用户正确被阻止访问远程数据');
    } else {
      console.log('✗ 警告：未登录用户仍可以访问远程数据');
    }
    
    // 验证本地数据访问是否允许
    const isLocalOnly = await strategyService.isLocalOnly();
    
    if (isLocalOnly) {
      console.log('✓ 未登录用户正确地仅限本地数据访问');
    } else {
      console.log('✗ 警告：未登录用户本地访问设置不正确');
    }
  }
  
  // 运行测试
  testAuthProtection().catch(console.error);
  
} catch (error) {
  console.error('认证保护测试失败:', error.message);
}