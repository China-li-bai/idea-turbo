'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './landing.module.scss'

const features = [
  {
    icon: '🧠',
    title: 'AI 智能解析',
    description: '自然语言输入，如"下周二下午3点见王总"，自动解析时间、人物、地点，智能创建日程。',
  },
  {
    icon: '👔',
    title: 'Boss/秘书双视图',
    description: '老板视角关注重要时间节点和决策，秘书视角管理执行细节和跟进。角色切换，高效协作。',
  },
  {
    icon: '💡',
    title: '灵光时刻捕获',
    description: '浮动按钮一键记录突发灵感、会议要点、待办事项。永不丢失重要想法，随时转化为正式日程。',
  },
  {
    icon: '🔒',
    title: '本地优先 · 隐私至上',
    description: '数据完全存储在本地设备，敏感日程和信息永不离开你的电脑。计算下沉到端，数据决不上云。',
  },
  {
    icon: '⚡',
    title: '智能冲突检测',
    description: '实时监测日程时间重叠，优雅提示冲突并提供解决方案。告别双订，轻松管理繁忙日程。',
  },
  {
    icon: '🌍',
    title: '多语言 · 跨时区',
    description: '智能识别系统语言，支持简体中文、繁体中文、英文、日文、韩文。自动时区适配，全球协作。',
  },
]

const testimonials = [
  {
    name: '张总',
    role: '科技公司CEO',
    content: '双视图设计太懂管理者了！老板视角看关键节点，秘书处理细节，效率提升50%。',
  },
  {
    name: '李秘书',
    role: '行政总监',
    content: '自然语言创建日程真的太方便了！再也不用手动填一堆字段，说句话就搞定了。',
  },
  {
    name: '王经理',
    role: '产品负责人',
    content: '本地存储让我特别安心，商业机密日程完全不用担心泄露。功能也很强大！',
  },
]

const screenshots = [
  { id: 1, label: '日历视图', emoji: '📅' },
  { id: 2, label: '快速捕获', emoji: '⚡' },
  { id: 3, label: '冲突检测', emoji: '⚠️' },
]

const comparison = [
  {
    feature: '日程创建',
    traditional: '手动选择日期、时间、地点，反复输入',
    ai: '自然语言一句话创建，AI自动解析全部信息',
  },
  {
    feature: '多角色协作',
    traditional: '一个视图所有人用，信息杂乱',
    ai: 'Boss/秘书双视角，各司其职',
  },
  {
    feature: '数据安全',
    traditional: '云端存储，隐私风险',
    ai: '本地优先，数据永远在你手中',
  },
  {
    feature: '冲突处理',
    traditional: '事后发现，手忙脚乱',
    ai: '智能预警，提前解决',
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubscribed(true)
      setEmail('')
    }
  }

  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📅</span>
          <span className={styles.logoText}>AI Calendar</span>
        </div>
        <nav className={styles.nav}>
          <Link href="#features" className={styles.navLink}>功能</Link>
          <Link href="#comparison" className={styles.navLink}>对比</Link>
          <Link href="#testimonials" className={styles.navLink}>用户评价</Link>
          <Link href="/app" className={styles.ctaButton}>立即体验 →</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gridPattern} />
        </div>
        
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            本地优先 · AI 驱动 · 隐私至上
          </div>
          
          <h1 className={styles.heroTitle}>
            智能日程，
            <span className={styles.highlight}>高效管理</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            告别繁琐的日程管理。AI 智能解析、自然语言创建、Boss/秘书双视角、本地优先存储，
            <br />
            让时间管理更智能、更安全、更高效。
          </p>

          <div className={styles.heroActions}>
            <Link href="/app" className={styles.primaryButton}>
              立即体验 →
            </Link>
            <a href="#features" className={styles.secondaryButton}>
              了解更多
            </a>
          </div>

          <div className={styles.heroDemo}>
            <div className={styles.demoCard}>
              <div className={styles.demoHeader}>
                <span className={styles.demoDot} />
                <span className={styles.demoDot} />
                <span className={styles.demoDot} />
              </div>
              <div className={styles.demoContent}>
                <div className={styles.demoInput}>
                  💡 输入: "下周二下午3点和王总开会，讨论Q3计划"
                </div>
                <div className={styles.demoArrow}>↓</div>
                <div className={styles.demoOutput}>
                  ✓ 已创建: <strong>与王总会议</strong><br />
                  📅 日期: 下周二 15:00-16:00<br />
                  📝 备注: 讨论Q3计划
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>强大功能，触手可及</h2>
          <p className={styles.sectionSubtitle}>
            每一个功能都经过精心设计，为你解决真实痛点
          </p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="comparison" className={styles.comparison}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>传统 vs AI 智能日程</h2>
          <p className={styles.sectionSubtitle}>
            看看 AI Calendar 如何让日程管理更高效
          </p>
        </div>

        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <div className={styles.comparisonCell}></div>
            <div className={styles.comparisonCell}>
              <span className={styles.bad}>传统日历</span>
            </div>
            <div className={styles.comparisonCell}>
              <span className={styles.good}>AI Calendar</span>
            </div>
          </div>
          {comparison.map((item, index) => (
            <div key={index} className={styles.comparisonRow}>
              <div className={styles.comparisonCell}>{item.feature}</div>
              <div className={styles.comparisonCell}>
                <span className={styles.badText}>{item.traditional}</span>
              </div>
              <div className={styles.comparisonCell}>
                <span className={styles.goodText}>{item.ai}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className={styles.testimonials}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>用户真实评价</h2>
          <p className={styles.sectionSubtitle}>
            听听他们怎么说
          </p>
        </div>

        <div className={styles.testimonialGrid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} className={styles.testimonialCard}>
              <div className={styles.testimonialQuote}>"</div>
              <p className={styles.testimonialContent}>{testimonial.content}</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className={styles.testimonialName}>{testimonial.name}</div>
                  <div className={styles.testimonialRole}>{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.screenshots}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>简洁直观 · 高效管理</h2>
          <p className={styles.sectionSubtitle}>
            精心设计的界面，让日程管理成为一种享受
          </p>
        </div>

        <div className={styles.screenshotGrid}>
          {screenshots.map((screenshot) => (
            <div key={screenshot.id} className={styles.screenshotCard}>
              <div className={styles.screenshotPlaceholder}>
                <span className={styles.screenshotEmoji}>{screenshot.emoji}</span>
                <span className={styles.screenshotLabel}>{screenshot.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.privacy}>
        <div className={styles.privacyContent}>
          <div className={styles.privacyIcon}>🔐</div>
          <h2 className={styles.privacyTitle}>你的数据，你做主</h2>
          <p className={styles.privacyText}>
            严格遵循"计算下沉到端，数据决不上云"原则。
            你的日程、笔记、灵感都存储在本地设备，
            敏感信息永不离开你的电脑。
          </p>
          <div className={styles.privacyBadges}>
            <span className={styles.privacyBadge}>本地存储</span>
            <span className={styles.privacyBadge}>离线可用</span>
            <span className={styles.privacyBadge}>隐私优先</span>
            <span className={styles.privacyBadge}>端计算</span>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>准备好更智能地管理时间了吗？</h2>
        <p className={styles.ctaSubtitle}>
          立即开始使用，让 AI 成为你的私人日程助手
        </p>
        <Link href="/app" className={styles.ctaButtonLarge}>
          开启智能日程之旅 →
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>📅</span>
            <span className={styles.logoText}>AI Calendar</span>
          </div>
          <p className={styles.footerTagline}>
            本地优先的 AI 智能日程管理 · 让时间成为朋友
          </p>
          <div className={styles.footerLinks}>
            <a href="#">隐私政策</a>
            <a href="#">使用条款</a>
            <a href="#">联系我们</a>
          </div>
          <p className={styles.copyright}>
            © 2024 AI Calendar. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
