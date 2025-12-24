/**
 * Stripe支付服务
 * 
 * 遵循Linus原则：消除不必要的抽象层，直接对接Stripe SDK
 * Jobs原则：流畅的支付体验，最小化用户操作
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { PaymentMethod, SubscriptionPlan, PaymentTransaction } from '@/types/subscription';
import { subscriptionBackendService } from './SubscriptionBackendService';

interface StripeConfig {
  publishableKey: string;
  priceIds: {
    'lifetime': string;
    'yearly': string;
    'monthly': string;
  };
}

// 测试环境配置 - 使用Stripe测试密钥
const STRIPE_TEST_CONFIG: StripeConfig = {
  publishableKey: 'pk_test_51234567890abcdef', // 占位符，需要替换为真实测试密钥
  priceIds: {
    'lifetime': 'price_test_lifetime_49usd',
    'yearly': 'price_test_yearly_12usd',
    'monthly': 'price_test_monthly_1usd'
  }
};

export class StripeService {
  private stripe: Stripe | null = null;
  private config: StripeConfig;

  constructor(config?: StripeConfig) {
    this.config = config || STRIPE_TEST_CONFIG;
  }

  /**
   * 初始化Stripe
   */
  async initialize(): Promise<void> {
    if (!this.stripe) {
      this.stripe = await loadStripe(this.config.publishableKey);
      if (!this.stripe) {
        throw new Error('Failed to initialize Stripe');
      }
    }
  }

  /**
   * 创建结账会话
   * 集成后端服务，确保数据一致性
   */
  async createCheckoutSession(plan: SubscriptionPlan, userId: string): Promise<string> {
    await this.initialize();
    
    try {
      // 调用后端服务创建session
      const sessionId = await subscriptionBackendService.createStripeCheckoutSession(plan, userId);
      
      console.log('✅ Stripe会话创建成功:', sessionId);
      return sessionId;
      
    } catch (error) {
      console.error('❌ 创建Stripe会话失败:', error);
      throw new Error('创建支付会话失败: ' + (error as Error).message);
    }
  }

  /**
   * 重定向到Stripe结账页面
   * 增强支付成功处理逻辑
   */
  async redirectToCheckout(sessionId: string): Promise<void> {
    await this.initialize();
    
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    if (this.isTestMode()) {
      // 测试模式：模拟支付成功并调用后端处理
      console.log('🎯 Test Mode: Simulating successful payment for session:', sessionId);
      
      // 显示测试模式提示
      this.showTestModeAlert(sessionId);
      
      // 模拟3秒后支付成功
      setTimeout(async () => {
        await this.handleTestPaymentSuccess(sessionId);
      }, 3000);
      
      return;
    }

    // 生产环境重定向到真实Stripe页面
    const { error } = await this.stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 处理测试环境的支付成功
   * 模拟真实的webhook处理流程
   */
  private async handleTestPaymentSuccess(sessionId: string): Promise<void> {
    try {
      // 解析sessionId获取用户和计划信息
      const sessionParts = sessionId.split('_');
      const planId = sessionParts[3];
      const userId = sessionParts[4];
      
      if (!planId || !userId) {
        throw new Error('无效的session ID格式');
      }

      // 模拟Stripe webhook数据
      const mockCheckoutSessionData = {
        id: sessionId,
        payment_status: 'paid',
        customer_details: {
          email: 'fangfangtongzhi@gmail.com' // 测试邮箱
        },
        metadata: {
          userId,
          planId
        },
        amount_total: planId === 'lifetime' ? 4900 : planId === 'yearly' ? 1200 : 100, // 以分为单位
        currency: 'usd'
      };

      // 调用后端服务处理支付成功
      await subscriptionBackendService.handleCheckoutSessionCompleted(mockCheckoutSessionData);

      // 触发前端支付成功事件
      const event = new CustomEvent('stripe-payment-success', {
        detail: {
          sessionId,
          paymentIntentId: 'pi_test_' + Date.now(),
          status: 'succeeded',
          userId,
          planId
        }
      });
      window.dispatchEvent(event);

      console.log('🎉 测试支付处理完成');
      
    } catch (error) {
      console.error('❌ 测试支付处理失败:', error);
      
      // 触发支付失败事件
      const event = new CustomEvent('stripe-payment-error', {
        detail: {
          sessionId,
          error: (error as Error).message
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 验证支付状态
   * 集成后端验证服务
   */
  async verifyPayment(sessionId: string): Promise<PaymentTransaction> {
    try {
      return await subscriptionBackendService.verifyStripePayment(sessionId);
    } catch (error) {
      console.error('验证支付失败:', error);
      throw error;
    }
  }

  /**
   * 显示测试模式警告
   * 改进UI交互，增加支付处理状态
   */
  private showTestModeAlert(sessionId: string): void {
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = `
      <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                  background: #1a1d24; border: 2px solid #FFD700; border-radius: 12px; 
                  padding: 20px; color: white; z-index: 10000; max-width: 400px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.5);" id="test-payment-alert">
        <h3 style="margin: 0 0 10px 0; color: #FFD700;">🧪 测试模式</h3>
        <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.4;">
          当前为Stripe测试模式，正在处理支付...
        </p>
        <div style="margin: 10px 0;">
          <div style="width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
            <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #FFD700, #FFA500); border-radius: 2px; transition: width 0.5s ease;"></div>
          </div>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #8b9bb4;" id="progress-text">
            初始化支付处理...
          </p>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #8b9bb4;">
          Session ID: ${sessionId}
        </p>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="position: absolute; top: 5px; right: 10px; 
                       background: none; border: none; color: #8b9bb4; 
                       cursor: pointer; font-size: 16px;">×</button>
      </div>
    `;
    document.body.appendChild(alertDiv);

    // 模拟处理进度
    const progressBar = alertDiv.querySelector('#progress-bar') as HTMLElement;
    const progressText = alertDiv.querySelector('#progress-text') as HTMLElement;
    
    let progress = 0;
    const progressSteps = [
      '验证支付信息...',
      '更新用户状态...',
      '处理订阅激活...',
      '完成支付处理...'
    ];

    const progressInterval = setInterval(() => {
      progress += 25;
      if (progressBar) progressBar.style.width = `${progress}%`;
      
      if (progressText && progress <= 100) {
        const stepIndex = Math.min(Math.floor(progress / 25), progressSteps.length - 1);
        progressText.textContent = progressSteps[stepIndex];
      }
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        if (progressText) progressText.textContent = '支付处理完成，即将跳转...';
        
        // 4秒后自动移除提示
        setTimeout(() => {
          if (alertDiv.parentElement) {
            alertDiv.remove();
          }
        }, 1000);
      }
    }, 750); // 每750ms更新一次进度
  }

  /**
   * 检查是否为测试模式
   */
  private isTestMode(): boolean {
    return this.config.publishableKey.includes('pk_test_') || 
           this.config.publishableKey === 'pk_test_51234567890abcdef';
  }

  /**
   * 获取支持的支付方式
   */
  getSupportedPaymentMethods(): PaymentMethod[] {
    return [PaymentMethod.STRIPE];
  }
}

// 单例模式
export const stripeService = new StripeService();