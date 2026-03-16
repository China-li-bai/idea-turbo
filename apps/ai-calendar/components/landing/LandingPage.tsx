'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { useI18nStore } from '@/lib/stores/i18nStore'
import { useTranslation } from '@/lib/utils/translations'
import styles from './landing.module.scss'

const features = [
  {
    icon: '🧠',
    titleKey: 'aiParsing',
    descriptionKey: 'aiParsingDesc',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
  },
  {
    icon: '👔',
    titleKey: 'dualView',
    descriptionKey: 'dualViewDesc',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop',
  },
  {
    icon: '💡',
    titleKey: 'inspiration',
    descriptionKey: 'inspirationDesc',
    image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&h=400&fit=crop',
  },
  {
    icon: '🔒',
    titleKey: 'privacy',
    descriptionKey: 'privacyDesc',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop',
  },
  {
    icon: '⚡',
    titleKey: 'conflict',
    descriptionKey: 'conflictDesc',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop',
  },
  {
    icon: '🌍',
    titleKey: 'multilingual',
    descriptionKey: 'multilingualDesc',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
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
  { id: 1, labelKey: 'calendarView', image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop' },
  { id: 2, labelKey: 'quickCapture', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop' },
  { id: 3, labelKey: 'conflictDetection', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop' },
]

const comparison = [
  {
    featureKey: 'scheduleCreation',
    traditionalKey: 'traditionalCreation',
    aiKey: 'aiCreation',
  },
  {
    featureKey: 'multiRole',
    traditionalKey: 'traditionalRole',
    aiKey: 'aiRole',
  },
  {
    featureKey: 'dataSecurity',
    traditionalKey: 'traditionalSecurity',
    aiKey: 'aiSecurity',
  },
  {
    featureKey: 'conflictHandling',
    traditionalKey: 'traditionalConflict',
    aiKey: 'aiConflict',
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const featuresRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale } = useI18nStore()
  const t = useTranslation(locale)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubscribed(true)
      setEmail('')
    }
  }

  const getFeatureTitle = (key: string) => {
    const titles: Record<string, Record<string, string>> = {
      'zh-CN': {
        aiParsing: 'AI 智能解析',
        dualView: 'Boss/秘书双视图',
        inspiration: '灵光时刻捕获',
        privacy: '本地优先 · 隐私至上',
        conflict: '智能冲突检测',
        multilingual: '多语言 · 跨时区',
      },
      'zh-TW': {
        aiParsing: 'AI 智能解析',
        dualView: 'Boss/秘書雙視圖',
        inspiration: '靈光時刻捕獲',
        privacy: '本地優先 · 隱私至上',
        conflict: '智能衝突檢測',
        multilingual: '多語言 · 跨時區',
      },
      'en-US': {
        aiParsing: 'AI Intelligent Parsing',
        dualView: 'Boss/Secretary Dual Views',
        inspiration: 'Inspiration Capture',
        privacy: 'Local First · Privacy First',
        conflict: 'Smart Conflict Detection',
        multilingual: 'Multilingual · Timezone',
      },
      'ja-JP': {
        aiParsing: 'AIインテリジェント解析',
        dualView: 'Boss/秘書デュアルビュー',
        inspiration: 'インスピレーションキャプチャ',
        privacy: 'ローカルファースト · プライバシー最優先',
        conflict: 'スマート衝突検出',
        multilingual: '多言語 · タイムゾーン',
      },
      'ko-KR': {
        aiParsing: 'AI 인텔리전트 파싱',
        dualView: 'Boss/비서 듀얼 뷰',
        inspiration: '영감 캡처',
        privacy: '로컬 퍼스트 · 프라이버시 우선',
        conflict: '스마트 충돌 감지',
        multilingual: '다국어 · 타임존',
      },
    }
    return titles[locale]?.[key] || titles['en-US'][key]
  }

  const getFeatureDescription = (key: string) => {
    const descs: Record<string, Record<string, string>> = {
      'zh-CN': {
        aiParsingDesc: '自然语言输入，如"下周二下午3点见王总"，自动解析时间、人物、地点，智能创建日程。',
        dualViewDesc: '老板视角关注重要时间节点和决策，秘书视角管理执行细节和跟进。角色切换，高效协作。',
        inspirationDesc: '浮动按钮一键记录突发灵感、会议要点、待办事项。永不丢失重要想法，随时转化为正式日程。',
        privacyDesc: '数据完全存储在本地设备，敏感日程和信息永不离开你的电脑。计算下沉到端，数据决不上云。',
        conflictDesc: '实时监测日程时间重叠，优雅提示冲突并提供解决方案。告别双订，轻松管理繁忙日程。',
        multilingualDesc: '智能识别系统语言，支持简体中文、繁体中文、英文、日文、韩文。自动时区适配，全球协作。',
      },
      'zh-TW': {
        aiParsingDesc: '自然語言輸入，如"下週二下午3點見王總"，自動解析時間、人物、地點，智能創建日程。',
        dualViewDesc: '老闆視角關注重要時間節點和決策，秘書視角管理執行細節和跟進。角色切換，高效協作。',
        inspirationDesc: '浮動按鈕一鍵記錄突發靈感、會議要點、待辦事項。永不丟失重要想法，隨時轉化為正式日程。',
        privacyDesc: '數據完全存儲在本地設備，敏感日程和信息永不離開你的電腦。計算下沉到端，數據決不上雲。',
        conflictDesc: '實時監測日程時間重疊，優雅提示衝突並提供解決方案。告別雙訂，輕鬆管理繁忙日程。',
        multilingualDesc: '智能識別系統語言，支持簡體中文、繁體中文、英文、日文、韓文。自動時區適配，全球協作。',
      },
      'en-US': {
        aiParsingDesc: 'Natural language input like "Meet with Mr. Wang at 3pm next Tuesday" automatically parses time, person, location and creates schedules intelligently.',
        dualViewDesc: 'Boss view focuses on key timelines and decisions, Secretary view manages execution details and follow-ups. Role switching for efficient collaboration.',
        inspirationDesc: 'Floating button to capture sudden inspirations, meeting notes, todos. Never lose important ideas, convert to formal schedules anytime.',
        privacyDesc: 'Data fully stored locally, sensitive schedules and info never leave your computer. Compute at the edge, data never goes to cloud.',
        conflictDesc: 'Real-time schedule overlap detection, elegant conflict alerts with solutions. No more double bookings, manage busy schedules easily.',
        multilingualDesc: 'Smart system language detection, supports Simplified Chinese, Traditional Chinese, English, Japanese, Korean. Auto timezone adaption, global collaboration.',
      },
      'ja-JP': {
        aiParsingDesc: '「来週火曜日午後3時に王社長と会う」のような自然言語入力で、時間、人物、場所を自動解析し、スケジュールをインテリジェントに作成します。',
        dualViewDesc: 'ボスビューは重要なタイムラインと決定に焦点を当て、秘書ビューは実行の詳細とフォローアップを管理します。効率的なコラボレーションのためのロール切り替え。',
        inspirationDesc: '突然のインスピレーション、会議メモ、TODOをキャプチャするフローティングボタン。重要なアイデアを失うことはありません。いつでも正式なスケジュールに変換できます。',
        privacyDesc: 'データは完全にローカルに保存され、機密のスケジュールと情報はコンピュータから離れることはありません。エッジで計算し、データはクラウドに送信されません。',
        conflictDesc: 'リアルタイムのスケジュール重複検出、解決策付きのエレガントな衝突アラート。ダブルブッキングはもうありません。忙しいスケジュールを簡単に管理できます。',
        multilingualDesc: 'スマートシステム言語検出、簡体字中国語、繁体字中国語、英語、日本語、韓国語をサポート。自動タイムゾーン適応、グローバルコラボレーション。',
      },
      'ko-KR': {
        aiParsingDesc: '"다음 주 화요일 오후 3시에 왕사장과 만나기"와 같은 자연어 입력으로 시간, 사람, 장소를 자동으로 파싱하고 지능적으로 일정을 만듭니다.',
        dualViewDesc: '보스 뷰는 중요한 타임라인과 결정에 초점을 맞추고, 비서 뷰는 실행 세부 사항과 후속 조치를 관리합니다. 효율적인 협업을 위한 역할 전환.',
        inspirationDesc: '갑작스러운 영감, 회의 메모, 할 일을 캡처하는 플로팅 버튼. 중요한 아이디어를 잃지 마세요. 언제든지 정식 일정으로 변환할 수 있습니다.',
        privacyDesc: '데이터가 완전히 로컬에 저장되고, 민감한 일정과 정보는 컴퓨터에서 떠나지 않습니다. 엣지에서 계산하고 데이터는 클라우드에 절대 가지 않습니다.',
        conflictDesc: '실시간 일정 중복 감지, 솔루션이 포함된 우아한 충돌 알림. 더 이상 이중 예약은 없습니다. 바쁜 일정을 쉽게 관리하세요.',
        multilingualDesc: '스마트 시스템 언어 감지, 간체 중국어, 번체 중국어, 영어, 일본어, 한국어 지원. 자동 시간대 적응, 글로벌 협업.',
      },
    }
    return descs[locale]?.[key] || descs['en-US'][key]
  }

  const getComparisonText = (key: string) => {
    const texts: Record<string, Record<string, string>> = {
      'zh-CN': {
        scheduleCreation: '日程创建',
        traditionalCreation: '手动选择日期、时间、地点，反复输入',
        aiCreation: '自然语言一句话创建，AI自动解析全部信息',
        multiRole: '多角色协作',
        traditionalRole: '一个视图所有人用，信息杂乱',
        aiRole: 'Boss/秘书双视角，各司其职',
        dataSecurity: '数据安全',
        traditionalSecurity: '云端存储，隐私风险',
        aiSecurity: '本地优先，数据永远在你手中',
        conflictHandling: '冲突处理',
        traditionalConflict: '事后发现，手忙脚乱',
        aiConflict: '智能预警，提前解决',
      },
      'zh-TW': {
        scheduleCreation: '日程創建',
        traditionalCreation: '手動選擇日期、時間、地點，反覆輸入',
        aiCreation: '自然語言一句話創建，AI自動解析全部信息',
        multiRole: '多角色協作',
        traditionalRole: '一個視圖所有人用，信息雜亂',
        aiRole: 'Boss/秘書雙視角，各司其職',
        dataSecurity: '數據安全',
        traditionalSecurity: '雲端存儲，隱私風險',
        aiSecurity: '本地優先，數據永遠在你手中',
        conflictHandling: '衝突處理',
        traditionalConflict: '事後發現，手忙腳亂',
        aiConflict: '智能預警，提前解決',
      },
      'en-US': {
        scheduleCreation: 'Schedule Creation',
        traditionalCreation: 'Manual date, time, location selection, repeated inputs',
        aiCreation: 'One sentence in natural language, AI parses everything',
        multiRole: 'Multi-role Collaboration',
        traditionalRole: 'One view for everyone, messy information',
        aiRole: 'Boss/Secretary dual views, each with their role',
        dataSecurity: 'Data Security',
        traditionalSecurity: 'Cloud storage, privacy risks',
        aiSecurity: 'Local first, data always in your hands',
        conflictHandling: 'Conflict Handling',
        traditionalConflict: 'Discovered after the fact, panic',
        aiConflict: 'Smart warnings, solved in advance',
      },
      'ja-JP': {
        scheduleCreation: 'スケジュール作成',
        traditionalCreation: '手動で日付、時間、場所を選択、繰り返し入力',
        aiCreation: '自然言語で一文、AIがすべて解析',
        multiRole: 'マルチロールコラボレーション',
        traditionalRole: '全員に1つのビュー、情報が乱雑',
        aiRole: 'Boss/秘書デュアルビュー、それぞれの役割',
        dataSecurity: 'データセキュリティ',
        traditionalSecurity: 'クラウドストレージ、プライバシーリスク',
        aiSecurity: 'ローカルファースト、データは常にあなたの手に',
        conflictHandling: '衝突処理',
        traditionalConflict: '事後に発見、パニック',
        aiConflict: 'スマート警告、事前に解決',
      },
      'ko-KR': {
        scheduleCreation: '스케줄 생성',
        traditionalCreation: '수동으로 날짜, 시간, 장소 선택, 반복 입력',
        aiCreation: '자연어로 한 문장, AI가 모두 파싱',
        multiRole: '멀티 롤 협업',
        traditionalRole: '모두를 위한 하나의 뷰, 정보가 지저분함',
        aiRole: 'Boss/비서 듀얼 뷰, 각자 역할',
        dataSecurity: '데이터 보안',
        traditionalSecurity: '클라우드 스토리지, 프라이버시 위험',
        aiSecurity: '로컬 퍼스트, 데이터는 항상 당신의 손에',
        conflictHandling: '충돌 처리',
        traditionalConflict: '사후 발견, 패닉',
        aiConflict: '스마트 경고, 미리 해결',
      },
    }
    return texts[locale]?.[key] || texts['en-US'][key]
  }

  const getScreenshotLabel = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      'zh-CN': {
        calendarView: '日历视图',
        quickCapture: '快速捕获',
        conflictDetection: '冲突检测',
      },
      'zh-TW': {
        calendarView: '日曆視圖',
        quickCapture: '快速捕獲',
        conflictDetection: '衝突檢測',
      },
      'en-US': {
        calendarView: 'Calendar View',
        quickCapture: 'Quick Capture',
        conflictDetection: 'Conflict Detection',
      },
      'ja-JP': {
        calendarView: 'カレンダービュー',
        quickCapture: 'クイックキャプチャ',
        conflictDetection: '衝突検出',
      },
      'ko-KR': {
        calendarView: '캘린더 뷰',
        quickCapture: '퀵 캡처',
        conflictDetection: '충돌 감지',
      },
    }
    return labels[locale]?.[key] || labels['en-US'][key]
  }

  const stats = [
    { number: '50%', label: t.landing.stats.efficiency },
    { number: '100%', label: t.landing.stats.localStorage },
    { number: '5', label: t.landing.stats.languages },
    { number: '24/7', label: t.landing.stats.offline },
  ]

  return (
    <div className={styles.landing}>
      <header className={`${styles.header} ${scrollY > 50 ? styles.headerScrolled : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📅</span>
          <span className={styles.logoText}>智程日历</span>
        </div>
        <nav className={styles.nav}>
          <Link href="#features" className={styles.navLink}>{t.landing.nav.features}</Link>
          <Link href="#comparison" className={styles.navLink}>{t.landing.nav.comparison}</Link>
          <Link href="#testimonials" className={styles.navLink}>{t.landing.nav.testimonials}</Link>
          <Link href="/app" className={styles.ctaButton}>{t.landing.nav.cta}</Link>
        </nav>
        <LanguageSwitcher currentLocale={locale} onChange={setLocale} />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gradientOrb3} />
          <div className={styles.gridPattern} />
        </div>
        
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            {t.landing.hero.badge}
          </div>
          
          <h1 className={styles.heroTitle}>
            智能日程，
            <span className={styles.highlight}>{t.landing.hero.highlight}</span>
          </h1>
          
          <p className={styles.heroSubtitle}>{t.landing.hero.subtitle}</p>

          <div className={styles.heroActions}>
            <Link href="/app" className={styles.primaryButton}>
              {t.landing.hero.primaryButton}
            </Link>
            <a href="#features" className={styles.secondaryButton}>
              {t.landing.hero.secondaryButton}
            </a>
          </div>

          <div className={styles.statsBar}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statItem}>
                <div className={styles.statNumber}>{stat.number}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
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
          <h2 className={styles.sectionTitle}>{t.landing.features.title}</h2>
          <p className={styles.sectionSubtitle}>{t.landing.features.subtitle}</p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureImage}>
                <Image
                  src={feature.image}
                  alt={getFeatureTitle(feature.titleKey)}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index < 3}
                />
              </div>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{getFeatureTitle(feature.titleKey)}</h3>
              <p className={styles.featureDescription}>{getFeatureDescription(feature.descriptionKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="comparison" className={styles.comparison}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.landing.comparison.title}</h2>
          <p className={styles.sectionSubtitle}>{t.landing.comparison.subtitle}</p>
        </div>

        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <div className={styles.comparisonCell}></div>
            <div className={styles.comparisonCell}>
              <span className={styles.bad}>{t.landing.comparison.traditional}</span>
            </div>
            <div className={styles.comparisonCell}>
              <span className={styles.good}>{t.landing.comparison.ai}</span>
            </div>
          </div>
          {comparison.map((item, index) => (
            <div key={index} className={styles.comparisonRow}>
              <div className={styles.comparisonCell}>{getComparisonText(item.featureKey)}</div>
              <div className={styles.comparisonCell}>
                <span className={styles.badText}>{getComparisonText(item.traditionalKey)}</span>
              </div>
              <div className={styles.comparisonCell}>
                <span className={styles.goodText}>{getComparisonText(item.aiKey)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className={styles.testimonials}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.landing.testimonials.title}</h2>
          <p className={styles.sectionSubtitle}>{t.landing.testimonials.subtitle}</p>
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
          <h2 className={styles.sectionTitle}>{t.landing.screenshots.title}</h2>
          <p className={styles.sectionSubtitle}>{t.landing.screenshots.subtitle}</p>
        </div>

        <div className={styles.screenshotGrid}>
          {screenshots.map((screenshot) => (
            <div key={screenshot.id} className={styles.screenshotCard}>
              <Image
                src={screenshot.image}
                alt={getScreenshotLabel(screenshot.labelKey)}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={screenshot.id === 1}
                className={styles.screenshotImage}
              />
              <div className={styles.screenshotLabel}>{getScreenshotLabel(screenshot.labelKey)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.privacy}>
        <div className={styles.privacyContent}>
          <div className={styles.privacyIcon}>🔐</div>
          <h2 className={styles.privacyTitle}>{t.landing.privacy.title}</h2>
          <p className={styles.privacyText}>{t.landing.privacy.text}</p>
          <div className={styles.privacyBadges}>
            <span className={styles.privacyBadge}>{t.landing.privacy.badges.local}</span>
            <span className={styles.privacyBadge}>{t.landing.privacy.badges.offline}</span>
            <span className={styles.privacyBadge}>{t.landing.privacy.badges.privacy}</span>
            <span className={styles.privacyBadge}>{t.landing.privacy.badges.edge}</span>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>{t.landing.cta.title}</h2>
        <p className={styles.ctaSubtitle}>{t.landing.cta.subtitle}</p>
        <Link href="/app" className={styles.ctaButtonLarge}>
          {t.landing.cta.button}
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>📅</span>
            <span className={styles.logoText}>智程日历</span>
          </div>
          <p className={styles.footerTagline}>{t.landing.footer.tagline}</p>
          <div className={styles.footerLinks}>
            <a href="#">{t.landing.footer.links.privacy}</a>
            <a href="#">{t.landing.footer.links.terms}</a>
            <a href="#">{t.landing.footer.links.contact}</a>
          </div>
          <p className={styles.copyright}>
            © 2024 智程日历. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
