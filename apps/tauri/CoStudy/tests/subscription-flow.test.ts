/**
 * 订阅流程测试脚本
 * 
 * 验证从Stripe支付到Supabase用户状态更新的完整流程
 */

import { subscriptionBackendService } from '../src/services/SubscriptionBackendService';
import { getAuthService } from '../src/services/AuthService';

interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

/**
 * 测试订阅流程
 */
async function testSubscriptionFlow(): Promise<void> {
  console.log('🧪 开始测试订阅流程...\n');
  
  const testResults: TestResult[] = [];
  const testUserId = 'd321d72c-71b7-4b29-ad3c-a400ef8b4415'; // 对应数据库中的实际UUID
  const testPlanId = 'lifetime';

  try {
    // 步骤1: 测试创建Stripe会话
    console.log('📋 步骤1: 测试创建Stripe会话');
    try {
      const mockPlan = {
        id: 'lifetime',
        name: '终身会员',
        price: 49,
        currency: 'USD'
      };
      
      const sessionId = await subscriptionBackendService.createStripeCheckoutSession(
        mockPlan as any, 
        testUserId
      );
      
      testResults.push({
        step: '创建Stripe会话',
        success: true,
        details: { sessionId }
      });
      
      console.log('✅ Stripe会话创建成功:', sessionId);
      
      // 步骤2: 测试处理支付成功
      console.log('\n📋 步骤2: 测试处理支付成功');
      
      const mockCheckoutData = {
        id: sessionId,
        payment_status: 'paid',
        customer_details: {
          email: testUserId
        },
        metadata: {
          userId: testUserId,
          planId: testPlanId
        },
        amount_total: 4900, // $49.00 in cents
        currency: 'usd'
      };
      
      await subscriptionBackendService.handleCheckoutSessionCompleted(mockCheckoutData);
      
      testResults.push({
        step: '处理支付成功',
        success: true,
        details: mockCheckoutData
      });
      
      console.log('✅ 支付成功处理完成');
      
      // 步骤3: 验证用户订阅状态
      console.log('\n📋 步骤3: 验证用户订阅状态');
      
      const authService = getAuthService();
      const userProfile = await authService.getUserProfile(testUserId);
      
      if (userProfile) {
        testResults.push({
          step: '验证用户订阅状态',
          success: userProfile.subscription_type === 'premium',
          details: {
            subscription_type: userProfile.subscription_type,
            subscription_started_at: userProfile.subscription_started_at,
            subscription_expires_at: userProfile.subscription_expires_at
          }
        });
        
        console.log('✅ 用户订阅状态验证:', {
          subscription_type: userProfile.subscription_type,
          subscription_started_at: userProfile.subscription_started_at,
          subscription_expires_at: userProfile.subscription_expires_at
        });
      } else {
        testResults.push({
          step: '验证用户订阅状态',
          success: false,
          error: '用户配置文件不存在'
        });
        
        console.log('❌ 用户配置文件不存在');
      }
      
      // 步骤4: 测试支付验证
      console.log('\n📋 步骤4: 测试支付验证');
      
      const paymentTransaction = await subscriptionBackendService.verifyStripePayment(sessionId);
      
      testResults.push({
        step: '支付验证',
        success: paymentTransaction.status === 'completed',
        details: paymentTransaction
      });
      
      console.log('✅ 支付验证完成:', paymentTransaction);
      
    } catch (error) {
      testResults.push({
        step: '订阅流程测试',
        success: false,
        error: (error as Error).message
      });
      
      console.error('❌ 测试失败:', error);
    }
    
    // 输出测试结果摘要
    console.log('\n📊 测试结果摘要:');
    console.log('====================');
    
    testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.step}`);
      
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    console.log(`\n🎯 测试通过率: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    
    if (successCount === totalCount) {
      console.log('🎉 所有测试通过！订阅流程工作正常。');
    } else {
      console.log('⚠️ 部分测试失败，请检查相关服务。');
    }
    
  } catch (error) {
    console.error('💥 测试过程中发生意外错误:', error);
  }
}

/**
 * 测试过期订阅处理
 */
async function testExpiredSubscriptionHandling(): Promise<void> {
  console.log('\n🧪 测试过期订阅处理...');
  
  try {
    await subscriptionBackendService.processExpiredSubscriptions();
    console.log('✅ 过期订阅处理测试完成');
  } catch (error) {
    console.error('❌ 过期订阅处理测试失败:', error);
  }
}

/**
 * 主测试函数
 */
async function runTests(): Promise<void> {
  console.log('🚀 启动订阅系统测试\n');
  
  await testSubscriptionFlow();
  await testExpiredSubscriptionHandling();
  
  console.log('\n🏁 测试完成');
}

// 导出测试函数
export { runTests, testSubscriptionFlow, testExpiredSubscriptionHandling };

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}