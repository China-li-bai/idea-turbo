'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useI18nStore } from '@/lib/stores/i18nStore'
import { useTranslation } from '@/lib/utils/translations'
import styles from './landing.module.scss'

interface Feature {
  icon: string
  titleKey: { 'zh-CN': string; 'en-US': string }
  descKey: { 'zh-CN': string; 'en-US': string }
}

interface Testimonial {
  name: string
  role: string
  contentKey: { 'zh-CN': string; 'en-US': string }
  avatar: string
}

interface ComparisonRow {
  featureKey: { 'zh-CN': string; 'en-US': string }
  traditionalKey: { 'zh-CN': string; 'en-US': string }
  privlocalKey: { 'zh-CN': string; 'en-US': string }
}

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale } = useI18nStore()
  const t = useTranslation(locale)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setIsSubscribed(true)
  }

  const txt = (obj: Record<string, string>) => obj[locale] || obj['zh-CN']

  const features: Feature[] = [
    { 
      icon: '🧠', 
      titleKey: { 'zh-CN': 'AI 智能解析', 'en-US': 'AI Smart Parsing' },
      descKey: { 'zh-CN': '自然语言理解，自动识别时间、地点、参与人', 'en-US': 'Natural language understanding, auto-detects time, location, participants' }
    },
    { 
      icon: '🔒', 
      titleKey: { 'zh-CN': '本地优先存储', 'en-US': 'Local-First Storage' },
      descKey: { 'zh-CN': '数据永不离开你的设备，完全掌控个人隐私', 'en-US': 'Data never leaves your device, complete privacy control' }
    },
    { 
      icon: '👥', 
      titleKey: { 'zh-CN': 'Boss/秘书双视角', 'en-US': 'Boss/Secretary Dual View' },
      descKey: { 'zh-CN': '智能角色切换，满足不同管理需求', 'en-US': 'Smart role switching for different management needs' }
    },
    { 
      icon: '⚡', 
      titleKey: { 'zh-CN': '实时冲突检测', 'en-US': 'Real-time Conflict Detection' },
      descKey: { 'zh-CN': '自动发现日程冲突，提供最优调整建议', 'en-US': 'Auto-detect scheduling conflicts with optimal adjustment suggestions' }
    },
    { 
      icon: '🌍', 
      titleKey: { 'zh-CN': '多语言支持', 'en-US': 'Multi-language Support' },
      descKey: { 'zh-CN': '支持中英日韩等多语言，全球化团队协作', 'en-US': 'Supports Chinese, English, Japanese, Korean and more for global teams' }
    },
    { 
      icon: '💡', 
      titleKey: { 'zh-CN': '灵感捕捉', 'en-US': 'Inspiration Capture' },
      descKey: { 'zh-CN': '随时记录灵感，AI 智能整理成可执行计划', 'en-US': 'Capture ideas anytime, AI organizes them into actionable plans' }
    }
  ]

  const testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      role: 'Product Manager',
      contentKey: {
        'zh-CN': 'PrivLocal 完全改变了我的日程管理方式。AI 解析太准确了，而且知道数据在本地让我非常安心。',
        'en-US': 'PrivLocal completely changed how I manage my schedule. The AI parsing is incredibly accurate, and knowing the data stays local gives me peace of mind.'
      },
      avatar: 'SC'
    },
    {
      name: 'Marcus Weber',
      role: 'Privacy Advocate',
      contentKey: {
        'zh-CN': '作为隐私倡导者，我终于找到一个真正尊重用户数据的日历应用。本地优先是未来！',
        'en-US': 'As a privacy advocate, I finally found a calendar app that truly respects user data. Local-first is the future!'
      },
      avatar: 'MW'
    },
    {
      name: '田中太郎',
      role: 'Software Engineer',
      contentKey: {
        'zh-CN': '日本語のサポートも完璧で、オフラインでも使えるのが本当に便利です。エンジニアとして技術的な実装にも感心しました。',
        'en-US': 'Japanese support is perfect, and being able to use it offline is truly convenient. As an engineer, I\'m impressed by the technical implementation.'
      },
      avatar: '田'
    }
  ]

  const comparisonData: ComparisonRow[] = [
    { 
      featureKey: { 'zh-CN': '数据存储', 'en-US': 'Data Storage' },
      traditionalKey: { 'zh-CN': '云端服务器', 'en-US': 'Cloud Server' },
      privlocalKey: { 'zh-CN': '本地设备', 'en-US': 'Your Device' }
    },
    { 
      featureKey: { 'zh-CN': 'AI 处理', 'en-US': 'AI Processing' },
      traditionalKey: { 'zh-CN': '远程 API', 'en-US': 'Remote API' },
      privlocalKey: { 'zh-CN': '浏览器端', 'en-US': 'In-Browser' }
    },
    { 
      featureKey: { 'zh-CN': '离线使用', 'en-US': 'Offline Usage' },
      traditionalKey: { 'zh-CN': '功能受限', 'en-US': 'Limited Features' },
      privlocalKey: { 'zh-CN': '完全可用', 'en-US': 'Fully Available' }
    },
    { 
      featureKey: { 'zh-CN': '隐私控制', 'en-US': 'Privacy Control' },
      traditionalKey: { 'zh-CN': '共享给第三方', 'en-US': 'Shared with Third Parties' },
      privlocalKey: { 'zh-CN': '完全自主控制', 'en-US': 'Full User Control' }
    },
    { 
      featureKey: { 'zh-CN': '费用模式', 'en-US': 'Pricing Model' },
      traditionalKey: { 'zh-CN': '订阅制收费', 'en-US': 'Subscription Fee' },
      privlocalKey: { 'zh-CN': '永久免费基础版', 'en-US': 'Free Forever (Basic)' }
    }
  ]

  const navLabels = {
    features: txt({ 'zh-CN': '功能', 'en-US': 'Features' }),
    security: txt({ 'zh-CN': '安全特性', 'en-US': 'Security' }),
    pricing: txt({ 'zh-CN': '定价', 'en-US': 'Pricing' }),
    faq: txt({ 'zh-CN': '常见问题', 'en-US': 'FAQ' }),
    langSwitch: locale === 'zh-CN' ? 'EN' : '中文'
  }

  const trustStats = {
    text: txt({ 'zh-CN': '全球 10,000+ 专业人士信赖的选择', 'en-US': 'Trusted by 10,000+ professionals worldwide' }),
    stat2Label: txt({ 'zh-CN': '可用性', 'en-US': 'Uptime' }),
    stat3Label: txt({ 'zh-CN': '数据泄露', 'en-US': 'Data Breaches' })
  }

  const securityItems = [
    {
      title: txt({ 'zh-CN': '本地处理', 'en-US': 'Local Processing' }),
      desc: txt({ 
        'zh-CN': '所有 AI 计算都在浏览器端完成，数据不离开设备', 
        'en-US': 'All AI computation happens in-browser, data never leaves device' 
      })
    },
    {
      title: txt({ 'zh-CN': '零数据收集', 'en-US': 'Zero Data Collection' }),
      desc: txt({ 
        'zh-CN': '我们不会收集、存储或分享任何个人数据', 
        'en-US': 'We collect, store, or share zero personal data' 
      })
    },
    {
      title: txt({ 'zh-CN': '开源透明', 'en-US': 'Open Source & Transparent' }),
      desc: txt({ 
        'zh-CN': '核心代码开源，安全审计可验证', 
        'en-US': 'Core code is open source, security auditable' 
      })
    }
  ]

  const flowCaption = txt({
    'zh-CN': '数据流：你 → 本地浏览器 → 你的设备（永远不上云）',
    'en-US': 'Data Flow: You → Local Browser → Your Device (Never to Cloud)'
  })

  const pricingLabels = {
    title: txt({ 'zh-CN': '简单透明的定价', 'en-US': 'Simple, Transparent Pricing' }),
    subtitle: txt({ 'zh-CN': '选择适合你的方案，随时升级或降级', 'en-US': 'Choose the plan that works for you, upgrade or downgrade anytime' }),
    free: txt({ 'zh-CN': '免费版', 'en-US': 'Free' }),
    pro: txt({ 'zh-CN': '专业版', 'en-US': 'Pro' }),
    enterprise: txt({ 'zh-CN': '企业版', 'en-US': 'Enterprise' }),
    month: txt({ 'zh-CN': '月', 'en-US': '/mo' }),
    popular: txt({ 'zh-CN': '最受欢迎', 'en-US': 'Most Popular' }),
    getStarted: txt({ 'zh-CN': '开始使用', 'en-US': 'Get Started' }),
    contactSales: txt({ 'zh-CN': '联系销售', 'en-US': 'Contact Sales' }),
    freeFeatures: [
      txt({ 'zh-CN': '无限日程创建', 'en-US': 'Unlimited calendar events' }),
      txt({ 'zh-CN': 'AI 自然语言解析', 'en-US': 'AI natural language parsing' }),
      txt({ 'zh-CN': '本地数据存储', 'en-US': 'Local data storage' })
    ],
    proFeatures: [
      txt({ 'zh-CN': '免费版所有功能', 'en-US': 'Everything in Free' }),
      txt({ 'zh-CN': '高级 AI 特性', 'en-US': 'Advanced AI features' }),
      txt({ 'zh-CN': '多设备同步（端到端加密）', 'en-US': 'Multi-device sync (E2EE)' }),
      txt({ 'zh-CN': '优先技术支持', 'en-US': 'Priority support' })
    ],
    enterpriseFeatures: [
      txt({ 'zh-CN': '专业版所有功能', 'en-US': 'Everything in Pro' }),
      txt({ 'zh-CN': '私有化部署', 'en-US': 'Private deployment' }),
      txt({ 'zh-CN': '定制化开发', 'en-US': 'Custom development' })
    ]
  }

  const faqTitle = txt({ 'zh-CN': '常见问题', 'en-US': 'Frequently Asked Questions' })

  const faqItems = [
    { 
      q: txt({ 'zh-CN': '离线时能使用吗？', 'en-US': 'Can I use it offline?' }),
      a: txt({ 
        'zh-CN': '完全可以！PrivLocal 采用本地优先架构，所有核心功能都可以在离线状态下正常使用，包括创建日程、查看日历、AI 解析等。只有在需要同步到其他设备时才需要网络连接。',
        'en-US': 'Absolutely! PrivLocal uses a local-first architecture, so all core features work offline, including creating events, viewing calendars, and AI parsing. Network connection is only needed when syncing to other devices.'
      })
    },
    { 
      q: txt({ 'zh-CN': '如何导出我的数据？', 'en-US': 'How can I export my data?' }),
      a: txt({ 
        'zh-CN': '我们支持多种数据导出格式，包括 iCal (.ics)、JSON 和 CSV。你可以随时从设置页面导出完整的数据备份，确保你对数据的完全控制权。',
        'en-US': 'We support multiple export formats including iCal (.ics), JSON, and CSV. You can export a full data backup anytime from the settings page, ensuring complete control over your data.'
      })
    },
    { 
      q: txt({ 'zh-CN': 'AI 处理是否安全？', 'en-US': 'Is AI processing secure?' }),
      a: txt({ 
        'zh-CN': '是的，100% 安全。所有的 AI 处理都在你的浏览器本地完成，使用 WebAssembly 和本地模型运行。你的输入内容不会被发送到任何服务器，我们无法访问你的任何数据。',
        'en-US': 'Yes, 100% secure. All AI processing happens locally in your browser using WebAssembly and local models. Your input is never sent to any server, and we cannot access any of your data.'
      })
    },
    { 
      q: txt({ 'zh-CN': '免费版真的免费吗？', 'en-US': 'Is the Free plan really free?' }),
      a: txt({ 
        'zh-CN': '是的，永久免费！免费版包含所有核心功能：无限日程创建、AI 解析、本地存储等。我们相信每个人都应该拥有隐私保护的工具。Pro 版本是为需要高级功能和团队协作的用户准备的。',
        'en-US': 'Yes, forever free! The Free plan includes all core features: unlimited events, AI parsing, local storage, and more. We believe everyone should have access to privacy-respecting tools. Pro is for users who need advanced features and team collaboration.'
      })
    }
  ]

  const ctaLabels = {
    emailPlaceholder: txt({ 'zh-CN': '输入你的邮箱地址', 'en-US': 'Enter your email address' }),
    successMsg: txt({ 'zh-CN': '感谢订阅！我们会尽快联系你。', 'en-US': 'Thanks for subscribing! We\'ll be in touch soon.' }),
    note: txt({ 
      'zh-CN': '✨ 无需信用卡 · 随时取消 · 永久免费基础版', 
      'en-US': '✨ No credit card required · Cancel anytime · Free forever for personal use' 
    })
  }

  const footerLabels = {
    product: txt({ 'zh-CN': '产品功能', 'en-US': 'Product' }),
    company: txt({ 'zh-CN': '关于我们', 'en-US': 'Company' })
  }

  const demoText = {
    input: txt({
      'zh-CN': '"明天下午3点和团队开个周会"',
      'en-US': '"Meet with the team tomorrow at 3pm for weekly sync"'
    }),
    arrow: '↓ AI Processing (Local)',
    outputCreated: txt({ 'zh-CN': '已创建：', 'en-US': 'Created:' }),
    outputEvent: txt({ 'zh-CN': '团队周会', 'en-US': 'Team Weekly Meeting' }),
    outputTime: txt({ 'zh-CN': '明天 下午3:00 - 4:00', 'en-US': 'Tomorrow, 3:00 PM - 4:00 PM' }),
    outputParticipants: txt({ 'zh-CN': '参与人：根据上下文自动识别', 'en-US': 'Participants: Auto-detected from context' })
  }

  return (
    <div className={styles.landing}>
      {/* Navigation */}
      <header className={`${styles.header} ${scrollY > 50 ? styles.headerScrolled : ''}`}>
        <div className={styles.headerContent}>
          <Link href="/app" className={styles.logo}>
            <Image 
              src="/android-chrome-512x512.png" 
              alt="PrivLocal" 
              width={32} 
              height={32}
              className={styles.logoImage}
            />
            <span className={styles.logoText}>PrivLocal</span>
          </Link>

          <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ''}`}>
            <a href="#features" className={styles.navLink}>{t.landing.nav.features}</a>
            <a href="#security" className={styles.navLink}>{navLabels.security}</a>
            <a href="#pricing" className={styles.navLink}>{navLabels.pricing}</a>
            <a href="#faq" className={styles.navLink}>{navLabels.faq}</a>
          </nav>

          <div className={styles.headerActions}>
            <button className={styles.langSwitch} onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}>
              {navLabels.langSwitch}
            </button>
            <Link href="/app" className={styles.ctaButton}>{t.landing.nav.cta}</Link>
            <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1}></div>
          <div className={styles.gradientOrb2}></div>
          <div className={styles.gridPattern}></div>
        </div>

        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <span className={styles.badgeDot}></span>
              <span>{t.landing.hero.badge}</span>
            </div>

            <h1 className={styles.heroTitle}>
              {t.landing.hero.title}
              <br />
              <span className={styles.highlight}>{t.landing.hero.highlight}</span>
            </h1>

            <p className={styles.heroSubtitle}>{t.landing.hero.subtitle}</p>

            <div className={styles.heroActions}>
              <Link href="/app" className={styles.primaryButton}>
                {t.landing.hero.primaryButton}
              </Link>
              <button onClick={scrollToFeatures} className={styles.secondaryButton}>
                ↓ {t.landing.hero.secondaryButton}
              </button>
            </div>

            <div className={styles.trustBadges}>
              <span className={styles.trustBadge}>🔒 256-bit Encryption</span>
              <span className={styles.trustBadge}>💻 Zero Cloud Dependency</span>
              <span className={styles.trustBadge}>✓ GDPR Compliant</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.demoCard}>
              <div className={styles.demoHeader}>
                <span className={`${styles.demoDot} ${styles.demoDotRed}`}></span>
                <span className={`${styles.demoDot} ${styles.demoDotYellow}`}></span>
                <span className={`${styles.demoDot} ${styles.demoDotGreen}`}></span>
              </div>
              <div className={styles.demoContent}>
                <div className={styles.demoInput}>{demoText.input}</div>
                <div className={styles.demoArrow}>{demoText.arrow}</div>
                <div className={styles.demoOutput}>
                  ✅ <strong>{demoText.outputCreated}</strong> {demoText.outputEvent}<br/>
                  📅 {demoText.outputTime}<br/>
                  👥 {demoText.outputParticipants}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className={styles.trustStrip}>
        <p className={styles.trustText}>{trustStats.text}</p>
        <div className={styles.trustStats}>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>10K+</div>
            <div className={styles.statLabel}>{t.landing.stats.efficiency}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>99.9%</div>
            <div className={styles.statLabel}>{trustStats.stat2Label}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>0</div>
            <div className={styles.statLabel}>{trustStats.stat3Label}</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.landing.features.title}</h2>
          <p className={styles.sectionSubtitle}>{t.landing.features.subtitle}</p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{txt(feature.titleKey)}</h3>
              <p className={styles.featureDescription}>{txt(feature.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security Deep-Dive */}
      <section id="security" className={styles.security}>
        <div className={styles.securityContainer}>
          <div className={styles.securityContent}>
            <h2 className={styles.securityTitle}>{t.landing.privacy.title}</h2>
            <p className={styles.securityText}>{t.landing.privacy.text}</p>

            <ul className={styles.securityList}>
              {securityItems.map((item, idx) => (
                <li key={idx} className={styles.securityItem}>
                  <span className={styles.securityCheck}>✓</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.securityVisual}>
            <div className={styles.dataFlowDiagram}>
              <div className={styles.flowNode}><span>👤 You</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowNode}><span>🖥️ Browser (Local)</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowNode}><span>💾 Your Device</span></div>
            </div>
            <p className={styles.flowCaption}>{flowCaption}</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className={styles.comparison}>
        <div className={styles.comparisonContainer}>
          <h2 className={styles.sectionTitle}>{t.landing.comparison.title}</h2>

          <div className={styles.comparisonTable}>
            <div className={styles.comparisonHeader}>
              <div>{t.landing.comparison.feature}</div>
              <div>{t.landing.comparison.traditional}</div>
              <div className={styles.highlightText}>PrivLocal</div>
            </div>

            {comparisonData.map((row, idx) => (
              <div key={idx} className={styles.comparisonRow}>
                <div className={styles.comparisonFeature}>{txt(row.featureKey)}</div>
                <div className={styles.bad}>{txt(row.traditionalKey)}</div>
                <div className={styles.good}>{txt(row.privlocalKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonials}>
        <div className={styles.testimonialsContainer}>
          <h2 className={styles.sectionTitle}>{t.landing.testimonials.title}</h2>

          <div className={styles.testimonialGrid}>
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className={styles.testimonialCard}>
                <span className={styles.testimonialQuote}>&quot;</span>
                <p className={styles.testimonialContent}>{txt(testimonial.contentKey)}</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{testimonial.avatar}</div>
                  <div>
                    <div className={styles.testimonialName}>{testimonial.name}</div>
                    <div className={styles.testimonialRole}>{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.pricingContainer}>
          <h2 className={styles.sectionTitle}>{pricingLabels.title}</h2>
          <p className={styles.sectionSubtitle}>{pricingLabels.subtitle}</p>

          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <h3 className={styles.pricingTier}>{pricingLabels.free}</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>{pricingLabels.month}</span>
              </div>
              <ul className={styles.pricingFeatures}>
                {pricingLabels.freeFeatures.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <button className={styles.pricingButtonSecondary}>{pricingLabels.getStarted}</button>
            </div>

            <div className={`${styles.pricingCard} ${styles.pricingFeatured}`}>
              <div className={styles.popularBadge}>{pricingLabels.popular}</div>
              <h3 className={styles.pricingTier}>{pricingLabels.pro}</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.priceAmount}>$9</span>
                <span className={styles.pricePeriod}>{pricingLabels.month}</span>
              </div>
              <ul className={styles.pricingFeatures}>
                {pricingLabels.proFeatures.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <button className={styles.pricingButtonPrimary}>{pricingLabels.getStarted}</button>
            </div>

            <div className={styles.pricingCard}>
              <h3 className={styles.pricingTier}>{pricingLabels.enterprise}</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.priceAmount}>Custom</span>
              </div>
              <ul className={styles.pricingFeatures}>
                {pricingLabels.enterpriseFeatures.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <button className={styles.pricingButtonSecondary}>{pricingLabels.contactSales}</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faq}>
        <div className={styles.faqContainer}>
          <h2 className={styles.sectionTitle}>{faqTitle}</h2>

          <div className={styles.faqList}>
            {faqItems.map((item, idx) => (
              <details key={idx} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{item.q}</summary>
                <p className={styles.faqAnswer}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className={styles.cta}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>{t.landing.cta.title}</h2>
          <p className={styles.ctaSubtitle}>{t.landing.cta.subtitle}</p>

          {!isSubscribed ? (
            <form onSubmit={handleSubscribe} className={styles.ctaForm}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ctaLabels.emailPlaceholder}
                className={styles.ctaInput}
                required
              />
              <button type="submit" className={styles.ctaButtonLarge}>
                {t.landing.cta.button}
              </button>
            </form>
          ) : (
            <div className={styles.successMessage}>
              ✓ {ctaLabels.successMsg}
            </div>
          )}

          <p className={styles.ctaNote}>{ctaLabels.note}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <Link href="/app" className={styles.footerBrand}>
            <Image 
              src="/android-chrome-512x512.png" 
              alt="PrivLocal" 
              width={28} 
              height={28}
              className={styles.logoImage}
            />
            <span className={styles.logoText}>PrivLocal</span>
          </Link>
          <p className={styles.footerTagline}>{t.landing.footer.tagline}</p>

          <div className={styles.footerLinks}>
            <a href="#">{footerLabels.product}</a>
            <a href="#">{footerLabels.company}</a>
            <a href="#">{t.landing.footer.links.privacy}</a>
            <a href="#">{t.landing.footer.links.contact}</a>
          </div>

          <p className={styles.copyright}>© 2026 PrivLocal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
