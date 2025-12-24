-- 用于组织和管理卡片集合
CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    deck_type TEXT NOT NULL DEFAULT 'mixed' CHECK (deck_type IN ('flashcard', 'vocabulary', 'mixed')),
    user_id TEXT, -- Optional for local-first, required for multi-user isolation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 存储卡片内容和所有 FSRS 调度参数
-- 完全对应 ts-fsrs Card 结构
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,

    -- 卡片内容
    front TEXT NOT NULL,
    back TEXT NOT NULL,

    -- FSRS 核心参数 (完全对应 ts-fsrs Card)
    due TIMESTAMPTZ NOT NULL, -- 下次复习到期时间
    stability REAL NOT NULL DEFAULT 0, -- 稳定性 (S)
    difficulty REAL NOT NULL DEFAULT 0, -- 难度 (D)
    elapsed_days INTEGER NOT NULL DEFAULT 0, -- 距离上次复习过去的实际天数
    scheduled_days INTEGER NOT NULL DEFAULT 0, -- 本次复习计划的间隔天数
    reps INTEGER NOT NULL DEFAULT 0, -- 总复习次数
    lapses INTEGER NOT NULL DEFAULT 0, -- "忘记" 的次数
    learning_steps INTEGER NOT NULL DEFAULT 0, -- FSRS 学习步骤计数
    state TEXT NOT NULL CHECK (state IN ('new', 'learning', 'review', 'relearning')), -- 卡片状态
    last_review TIMESTAMPTZ, -- 上次复习时间

    -- 元数据
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 记录每一次复习的详细历史，用于分析和追踪
CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- 复习事件详情
    review_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')), -- 用户评分
    review_duration_ms INTEGER, -- 复习所用时长（毫秒）

    -- 复习前后的状态快照
    state_before TEXT NOT NULL,
    state_after TEXT NOT NULL,
    stability_before REAL NOT NULL,
    stability_after REAL NOT NULL,
    difficulty_before REAL NOT NULL,
    difficulty_after REAL NOT NULL
);

-- 词汇卡片扩展数据表
CREATE TABLE IF NOT EXISTS vocabulary_cards (
    card_id TEXT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    
    -- 核心词汇信息
    word TEXT NOT NULL,
    language_code TEXT NOT NULL DEFAULT 'en',
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    frequency_rank INTEGER,
    
    -- 发音数据  
    ipa_pronunciation TEXT,
    audio_url TEXT,
    accent TEXT CHECK (accent IN ('US', 'UK', 'AU')),
    
    -- 词源和记忆
    etymology TEXT,
    mnemonic TEXT,
    
    -- 元数据
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 词汇释义表 (一对多关系)
CREATE TABLE IF NOT EXISTS vocabulary_definitions (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    
    part_of_speech TEXT NOT NULL,
    meaning_en TEXT NOT NULL,
    meaning_zh TEXT NOT NULL,
    example_en TEXT,
    example_zh TEXT,
    definition_order INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同义词表 (多对多关系)
CREATE TABLE IF NOT EXISTS vocabulary_synonyms (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    synonym TEXT NOT NULL,
    PRIMARY KEY (card_id, synonym)
);

-- 反义词表 (多对多关系)  
CREATE TABLE IF NOT EXISTS vocabulary_antonyms (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    antonym TEXT NOT NULL,
    PRIMARY KEY (card_id, antonym)
);

-- 为常用查询创建索引以优化性能
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
CREATE INDEX IF NOT EXISTS idx_review_logs_card_id ON review_logs(card_id);

-- 词汇表专用索引
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_word ON vocabulary_cards(word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_difficulty ON vocabulary_cards(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_language ON vocabulary_cards(language_code);
CREATE INDEX IF NOT EXISTS idx_vocabulary_definitions_card ON vocabulary_definitions(card_id, definition_order);
CREATE INDEX IF NOT EXISTS idx_vocabulary_definitions_pos ON vocabulary_definitions(part_of_speech);

-- ============================================
-- Parallel Study Space (P2P Social Learning)
-- ============================================

-- 学习会话表：记录用户的学习会话
CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    room_id TEXT,
    
    -- 会话时间
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- 学习统计
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_correct INTEGER NOT NULL DEFAULT 0,
    focus_score INTEGER,
    
    -- 会话类型
    session_type TEXT NOT NULL DEFAULT 'solo' CHECK (session_type IN ('solo', 'group')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户资料表：存储本地用户信息
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,

    -- 用户信息
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    avatar_color TEXT,

    -- 订阅信息
    subscription_type TEXT NOT NULL DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium')),
    subscription_started_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,

    -- 学习偏好
    preferred_session_duration INTEGER DEFAULT 25,
    daily_goal INTEGER DEFAULT 50,

    -- 统计数据
    total_study_time INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户设置表：存储用户的应用偏好设置
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- 应用偏好
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),

    -- 通知设置
    daily_reminders BOOLEAN NOT NULL DEFAULT true,
    reminder_time TEXT NOT NULL DEFAULT '09:00',

    -- FSRS 算法参数
    fsrs_parameters JSONB NOT NULL DEFAULT '{"request_retention":0.9,"maximum_interval":36500,"w":[0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18,0.05,0.34,1.26,0.29,2.61],"enable_fuzz":false,"enable_short_term":true}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id)
);

-- 学习房间历史：记录参与过的学习房间
CREATE TABLE IF NOT EXISTS study_room_history (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    room_name TEXT,
    
    participant_count INTEGER,
    joined_at TIMESTAMPTZ NOT NULL,
    left_at TIMESTAMPTZ,
    
    cards_reviewed INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 活动脉冲表：记录学习活动的"脉冲"事件
CREATE TABLE IF NOT EXISTS activity_pulses (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES study_sessions(id) ON DELETE CASCADE,
    
    pulse_type TEXT NOT NULL CHECK (pulse_type IN ('card_review', 'streak', 'milestone')),
    intensity TEXT CHECK (intensity IN ('again', 'hard', 'good', 'easy')),
    
    card_id TEXT,
    value INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 成就表：记录用户达成的成就
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    
    target_value INTEGER,
    current_value INTEGER,
    is_unlocked BOOLEAN DEFAULT FALSE,
    
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 每日统计表：每日学习统计快照
CREATE TABLE IF NOT EXISTS daily_stats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stat_date DATE NOT NULL,
    
    -- 学习统计
    cards_reviewed INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    
    -- 社交统计
    group_sessions INTEGER DEFAULT 0,
    pulses_sent INTEGER DEFAULT 0,
    reactions_received INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, stat_date)
);

-- Study Room 索引
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_room ON study_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON study_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_room_history_room ON study_room_history(room_id);
CREATE INDEX IF NOT EXISTS idx_room_history_joined ON study_room_history(joined_at);

CREATE INDEX IF NOT EXISTS idx_pulses_session ON activity_pulses(session_id);
CREATE INDEX IF NOT EXISTS idx_pulses_type ON activity_pulses(pulse_type);
CREATE INDEX IF NOT EXISTS idx_pulses_created ON activity_pulses(created_at);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(is_unlocked);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, stat_date);

-- User Settings 索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- ============================================
-- Subscription & Payment System
-- ============================================

-- 支付交易表：记录所有支付交易
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- 计划信息
    plan_id TEXT NOT NULL,
    plan_name TEXT,
    
    -- 支付金额
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- 支付方式与外部ID
    payment_method TEXT NOT NULL DEFAULT 'stripe',
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- 交易状态
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    
    -- 客户信息
    customer_email TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- 备注信息
    notes TEXT
);

-- 订阅历史表：记录订阅状态变更历史
CREATE TABLE IF NOT EXISTS subscription_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- 订阅变更
    subscription_type_from TEXT,
    subscription_type_to TEXT NOT NULL,
    
    -- 变更原因
    change_reason TEXT NOT NULL CHECK (change_reason IN ('payment', 'upgrade', 'downgrade', 'cancellation', 'expiration', 'admin')),
    change_source TEXT DEFAULT 'system',
    
    -- 关联交易
    transaction_id TEXT REFERENCES payment_transactions(id),
    
    -- 时间信息
    effective_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 备注
    notes TEXT
);

-- 支付交易索引
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_session ON payment_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);

-- 订阅历史索引
CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_effective ON subscription_history(effective_at);
CREATE INDEX IF NOT EXISTS idx_subscription_history_reason ON subscription_history(change_reason);
