/**
 * 订阅系统数据库迁移
 * 
 * 创建支付交易表和相关索引
 * 遵循Linus原则：简单直接，无复杂抽象
 */

-- 创建支付交易表
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT DEFAULT 'stripe',
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending',
  customer_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
ON payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_session 
ON payment_transactions(stripe_session_id);

-- 确保user_profiles表有订阅相关字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- 创建订阅状态索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_type 
ON user_profiles(subscription_type);

CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_expires 
ON user_profiles(subscription_expires_at);