/**
 * 订阅引导页测试
 * 
 * 验证核心交互流程和Stripe集成
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SubscriptionOnboarding } from '../SubscriptionOnboarding';

// Mock Stripe服务
vi.mock('@/services/StripeService', () => ({
  stripeService: {
    createCheckoutSession: vi.fn(),
    redirectToCheckout: vi.fn(),
    initialize: vi.fn(),
  }
}));

// 测试包装器
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('SubscriptionOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染第一页内容', () => {
    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    expect(screen.getByText('您的第二大脑')).toBeInTheDocument();
    expect(screen.getByText('完全私有')).toBeInTheDocument();
    expect(screen.getByText('FSRS Algorithm')).toBeInTheDocument();
    expect(screen.getByText('Local-First')).toBeInTheDocument();
  });

  it('应该支持滑动到下一页', async () => {
    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    const nextButton = screen.getByText('下一步');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('独行')).toBeInTheDocument();
      expect(screen.getByText('但不孤独')).toBeInTheDocument();
    });
  });

  it('应该在最后一页显示订阅选项', async () => {
    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    const nextButton = screen.getByText('下一步');
    
    // 跳到第4页（付费页面）
    fireEvent.click(nextButton); // 第2页
    fireEvent.click(nextButton); // 第3页
    fireEvent.click(nextButton); // 第4页

    await waitFor(() => {
      expect(screen.getByText('投资您的专注力')).toBeInTheDocument();
      expect(screen.getByText('终身买断')).toBeInTheDocument();
      expect(screen.getByText('年度订阅')).toBeInTheDocument();
      expect(screen.getByText('开启平行时空')).toBeInTheDocument();
    });
  });

  it('应该支持选择不同的订阅计划', async () => {
    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    // 跳到付费页面
    const nextButton = screen.getByText('下一步');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    await waitFor(() => {
      const lifetimeCard = screen.getByText('终身买断').closest('.pricing-card');
      const yearlyCard = screen.getByText('年度订阅').closest('.pricing-card');

      expect(lifetimeCard).toHaveClass('selected');
      expect(yearlyCard).not.toHaveClass('selected');

      // 切换到年度订阅
      fireEvent.click(yearlyCard!);
      expect(yearlyCard).toHaveClass('selected');
      expect(lifetimeCard).not.toHaveClass('selected');
    });
  });

  it('应该正确显示点导航', async () => {
    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('dot')
    );

    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveClass('active');
    
    // 点击下一步，检查点导航更新
    const nextButton = screen.getByText('下一步');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(dots[0]).not.toHaveClass('active');
      expect(dots[1]).toHaveClass('active');
    });
  });

  it('应该处理Stripe支付流程', async () => {
    const mockCreateSession = vi.fn().mockResolvedValue('session_123');
    const mockRedirectToCheckout = vi.fn().mockResolvedValue(undefined);
    
    const { stripeService } = await import('@/services/StripeService');
    vi.mocked(stripeService.createCheckoutSession).mockImplementation(mockCreateSession);
    vi.mocked(stripeService.redirectToCheckout).mockImplementation(mockRedirectToCheckout);

    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    // 跳到付费页面并点击开始订阅
    const nextButton = screen.getByText('下一步');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    await waitFor(async () => {
      const startButton = screen.getByText('开启平行时空');
      fireEvent.click(startButton);

      // 验证Stripe调用
      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'lifetime',
            name: '终身买断',
            price: 49
          }),
          expect.stringContaining('demo_user_')
        );
        expect(mockRedirectToCheckout).toHaveBeenCalledWith('session_123');
      });
    });
  });

  it('应该响应Stripe支付成功事件', async () => {
    // Mock window.location
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    });

    render(
      <TestWrapper>
        <SubscriptionOnboarding />
      </TestWrapper>
    );

    // 模拟Stripe支付成功事件
    const event = new CustomEvent('stripe-payment-success', {
      detail: {
        sessionId: 'session_123',
        paymentIntentId: 'pi_test_123',
        status: 'succeeded'
      }
    });

    window.dispatchEvent(event);

    // 验证跳转行为
    await waitFor(() => {
      expect(mockLocation.href).toBe('/dashboard');
    });
  });
});