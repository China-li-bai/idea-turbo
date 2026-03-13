'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './landing.module.scss'

const features = [
  {
    icon: '🧠',
    title: 'AI 智能解析',
    description: '自然语言输入，如"下周二下午3点见王总"，自动创建日程',
  },
  {
    icon: '👔',
    title: 'Boss/秘书双视图',
    description: '老板关注时间节点，秘书管理执行细节，视角随心切换',
  },
  {
    icon: '💡',
    title: '灵光时刻捕获',
    description: '一键快速记录突发灵感，永不丢失重要想法',
  },
  {
    icon: '🔒',
    title: '本地优先隐私',
    description: '数据存储在本地设备，敏感信息永不离开你的电脑',
  },
  {
    icon: '⚡',
    title: '智能冲突检测',
    description: '自动检测时间冲突，优雅解决日程重叠问题',
  },
  {
    icon: '🌍',
    title: '多语言支持',
    description: '智能识别系统语言，界面自动适配中英日韩',
  },
]

const screenshots = [
  { id: 1, label: '日历视图', emoji: '📅' },
  { id: 2, label: '快速捕获', emoji: '⚡' },
  { id: 3, label: '冲突检测', emoji: '⚠️' },
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
          <Link href="/app" className={styles.navLink}>功能</Link>
          <Link href="/app" className={styles.navLink}>关于</Link>
          <Link href="/app" className={styles.ctaButton}>开始使用 →</Link>
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
            本地优先 · AI 驱动
          </div>
          
          <h1 className={styles.heroTitle}>
            你的日程，
            <span className={styles.highlight}>更智能</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            告别繁琐的日程管理。AI 智能解析、自然语言创建、Boss/秘书双视角，
            <br />
            让时间成为你的朋友，而非敌人。
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
                  💡 输入: "下周二下午3点和王总开会"
                </div>
                <div className={styles.demoArrow}>↓</div>
                <div className={styles.demoOutput}>
                  ✓ 已创建: <strong>与王总会议</strong><br />
                  📅 2024-XX-XX 15:00 - 16:00
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

      <section className={styles.screenshots}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>随时随地，高效管理</h2>
          <p className={styles.sectionSubtitle}>
            简洁直观的界面，让日程管理成为一种享受
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
            本地优先的 AI 智能日历 · 让时间成为朋友
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
