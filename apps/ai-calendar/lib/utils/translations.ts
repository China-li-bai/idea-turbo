import type { SupportedLocale } from './i18n'

export interface Translations {
  waitlist: {
    title: string
    description: string
    expectedDate: string
    benefitsTitle: string
    benefitEarlyAccess: string
    benefitDiscount: string
    benefitVoting: string
    emailPlaceholder: string
    submitButton: string
    submitting: string
    privacy: string
    successTitle: string
    successMessage: string
    closeButton: string
    errorInvalidEmail: string
    errorSubmissionFailed: string
    errorNetwork: string
  }
  landing: {
    nav: {
      features: string
      comparison: string
      testimonials: string
      cta: string
    }
    hero: {
      badge: string
      title: string
      highlight: string
      subtitle: string
      primaryButton: string
      secondaryButton: string
    }
    stats: {
      efficiency: string
      localStorage: string
      languages: string
      offline: string
    }
    features: {
      title: string
      subtitle: string
    }
    comparison: {
      title: string
      subtitle: string
      traditional: string
      ai: string
      feature: string
    }
    testimonials: {
      title: string
      subtitle: string
    }
    screenshots: {
      title: string
      subtitle: string
    }
    privacy: {
      title: string
      text: string
      badges: {
        local: string
        offline: string
        privacy: string
        edge: string
      }
    }
    cta: {
      title: string
      subtitle: string
      button: string
    }
    footer: {
      tagline: string
      links: {
        privacy: string
        terms: string
        contact: string
      }
    }
  }
}

export const translations: Record<SupportedLocale, Translations> = {
  'zh-CN': {
    waitlist: {
      title: '端到端加密同步（规划中）',
      description: '你的数据极度神圣。我们正在构建军规级（AES-256）的跨设备同步通道。即使是 privlocal 的开发者，也看不到你的任何日程。',
      expectedDate: '预计上线：2026 年 Q3',
      benefitsTitle: '加入等待列表，获取：',
      benefitEarlyAccess: '✓ 内测资格（提前 2 周体验）',
      benefitDiscount: '✓ 早鸟折扣（终身 5 折）',
      benefitVoting: '✓ 功能投票权（决定开发优先级）',
      emailPlaceholder: 'your@email.com',
      submitButton: '加入等待列表',
      submitting: '提交中...',
      privacy: '🔒 我们承诺：邮箱仅用于产品更新，绝不分享给第三方。可随时退订。',
      successTitle: '已加入等待列表！',
      successMessage: '我们会在功能上线时第一时间通知你。感谢你的支持！',
      closeButton: '关闭',
      errorInvalidEmail: '请输入有效的邮箱地址',
      errorSubmissionFailed: '提交失败，请稍后重试',
      errorNetwork: '网络错误，请稍后重试',
    },
    landing: {
      nav: {
        features: '功能',
        comparison: '对比',
        testimonials: '用户评价',
        cta: '立即体验 →',
      },
      hero: {
        badge: '本地优先 · AI 驱动 · 隐私至上',
        title: '智能日程，',
        highlight: '高效管理',
        subtitle: '告别繁琐的日程管理。AI 智能解析、自然语言创建、Boss/秘书双视角、本地优先存储，让时间管理更智能、更安全、更高效。',
        primaryButton: '立即体验 →',
        secondaryButton: '了解更多',
      },
      stats: {
        efficiency: '效率提升',
        localStorage: '本地存储',
        languages: '语言支持',
        offline: '离线可用',
      },
      features: {
        title: '强大功能，触手可及',
        subtitle: '每一个功能都经过精心设计，为你解决真实痛点',
      },
      comparison: {
        title: '传统 vs AI 智能日程',
        subtitle: '看看 AI Calendar 如何让日程管理更高效',
        traditional: '传统日历',
        ai: 'AI Calendar',
        feature: '功能',
      },
      testimonials: {
        title: '用户真实评价',
        subtitle: '听听他们怎么说',
      },
      screenshots: {
        title: '简洁直观 · 高效管理',
        subtitle: '精心设计的界面，让日程管理成为一种享受',
      },
      privacy: {
        title: '你的数据，你做主',
        text: '严格遵循"计算下沉到端，数据决不上云"原则。你的日程、笔记、灵感都存储在本地设备，敏感信息永不离开你的电脑。',
        badges: {
          local: '本地存储',
          offline: '离线可用',
          privacy: '隐私优先',
          edge: '端计算',
        },
      },
      cta: {
        title: '准备好更智能地管理时间了吗？',
        subtitle: '立即开始使用，让 AI 成为你的私人日程助手',
        button: '开启智能日程之旅 →',
      },
      footer: {
        tagline: '本地优先的 AI 智能日程管理 · 让时间成为朋友',
        links: {
          privacy: '隐私政策',
          terms: '使用条款',
          contact: '联系我们',
        },
      },
    },
  },
  'zh-TW': {
    waitlist: {
      title: '端到端加密同步（規劃中）',
      description: '你的數據極度神聖。我們正在構建軍規級（AES-256）的跨設備同步通道。即使是 privlocal 的開發者，也看不到你的任何日程。',
      expectedDate: '預計上線：2026 年 Q3',
      benefitsTitle: '加入等待列表，獲取：',
      benefitEarlyAccess: '✓ 內測資格（提前 2 週體驗）',
      benefitDiscount: '✓ 早鳥折扣（終身 5 折）',
      benefitVoting: '✓ 功能投票權（決定開發優先級）',
      emailPlaceholder: 'your@email.com',
      submitButton: '加入等待列表',
      submitting: '提交中...',
      privacy: '🔒 我們承諾：郵箱僅用於產品更新，絕不分享給第三方。可隨時退訂。',
      successTitle: '已加入等待列表！',
      successMessage: '我們會在功能上線時第一時間通知你。感謝你的支持！',
      closeButton: '關閉',
      errorInvalidEmail: '請輸入有效的郵箱地址',
      errorSubmissionFailed: '提交失敗，請稍後重試',
      errorNetwork: '網絡錯誤，請稍後重試',
    },
    landing: {
      nav: {
        features: '功能',
        comparison: '對比',
        testimonials: '用戶評價',
        cta: '立即體驗 →',
      },
      hero: {
        badge: '本地優先 · AI 驅動 · 隱私至上',
        title: '智能日程，',
        highlight: '高效管理',
        subtitle: '告別繁瑣的日程管理。AI 智能解析、自然語言創建、Boss/秘書雙視角、本地優先存儲，讓時間管理更智能、更安全、更高效。',
        primaryButton: '立即體驗 →',
        secondaryButton: '了解更多',
      },
      stats: {
        efficiency: '效率提升',
        localStorage: '本地存儲',
        languages: '語言支持',
        offline: '離線可用',
      },
      features: {
        title: '強大功能，觸手可及',
        subtitle: '每一個功能都經過精心設計，為你解決真實痛點',
      },
      comparison: {
        title: '傳統 vs AI 智能日程',
        subtitle: '看看 AI Calendar 如何讓日程管理更高效',
        traditional: '傳統日曆',
        ai: 'AI Calendar',
        feature: '功能',
      },
      testimonials: {
        title: '用戶真實評價',
        subtitle: '聽聽他們怎麼說',
      },
      screenshots: {
        title: '簡潔直觀 · 高效管理',
        subtitle: '精心設計的界面，讓日程管理成為一種享受',
      },
      privacy: {
        title: '你的數據，你做主',
        text: '嚴格遵循"計算下沉到端，數據決不上雲"原則。你的日程、筆記、靈感都存儲在本地設備，敏感信息永不離開你的電腦。',
        badges: {
          local: '本地存儲',
          offline: '離線可用',
          privacy: '隱私優先',
          edge: '端計算',
        },
      },
      cta: {
        title: '準備好更智能地管理時間了嗎？',
        subtitle: '立即開始使用，讓 AI 成為你的私人日程助手',
        button: '開啟智能日程之旅 →',
      },
      footer: {
        tagline: '本地優先的 AI 智能日程管理 · 讓時間成為朋友',
        links: {
          privacy: '隱私政策',
          terms: '使用條款',
          contact: '聯繫我們',
        },
      },
    },
  },
  'en-US': {
    waitlist: {
      title: 'End-to-End Encrypted Sync (Coming Soon)',
      description: 'Your data is sacred. We are building military-grade (AES-256) cross-device sync. Even privlocal developers cannot see your calendar.',
      expectedDate: 'Expected: Q3 2026',
      benefitsTitle: 'Join the waitlist to get:',
      benefitEarlyAccess: '✓ Early access (2 weeks ahead)',
      benefitDiscount: '✓ Early bird discount (50% off lifetime)',
      benefitVoting: '✓ Feature voting rights',
      emailPlaceholder: 'your@email.com',
      submitButton: 'Join Waitlist',
      submitting: 'Submitting...',
      privacy: '🔒 We promise: Your email is only for product updates, never shared with third parties. Unsubscribe anytime.',
      successTitle: 'You are on the list!',
      successMessage: 'We will notify you as soon as it is ready. Thank you for your support!',
      closeButton: 'Close',
      errorInvalidEmail: 'Please enter a valid email address',
      errorSubmissionFailed: 'Submission failed, please try again',
      errorNetwork: 'Network error, please try again',
    },
    landing: {
      nav: {
        features: 'Features',
        comparison: 'Comparison',
        testimonials: 'Testimonials',
        cta: 'Try Now →',
      },
      hero: {
        badge: 'Local First · AI Powered · Privacy First',
        title: 'Smart Scheduling,',
        highlight: 'Efficient Management',
        subtitle: 'Say goodbye to tedious schedule management. AI intelligent parsing, natural language creation, Boss/Secretary dual views, local-first storage, making time management smarter, safer, and more efficient.',
        primaryButton: 'Try Now →',
        secondaryButton: 'Learn More',
      },
      stats: {
        efficiency: 'Efficiency Gain',
        localStorage: 'Local Storage',
        languages: 'Languages',
        offline: 'Offline Ready',
      },
      features: {
        title: 'Powerful Features at Your Fingertips',
        subtitle: 'Every feature is carefully designed to solve real pain points',
      },
      comparison: {
        title: 'Traditional vs AI Smart Calendar',
        subtitle: 'See how AI Calendar makes schedule management more efficient',
        traditional: 'Traditional',
        ai: 'AI Calendar',
        feature: 'Feature',
      },
      testimonials: {
        title: 'Real User Reviews',
        subtitle: 'Hear what they have to say',
      },
      screenshots: {
        title: 'Simple & Intuitive · Efficient Management',
        subtitle: 'Carefully designed interface makes schedule management a pleasure',
      },
      privacy: {
        title: 'Your Data, Your Control',
        text: 'Strictly following the principle of "Compute at the Edge, Data Never Leaves the Device". Your schedules, notes, and inspirations are stored locally, sensitive information never leaves your computer.',
        badges: {
          local: 'Local Storage',
          offline: 'Offline Ready',
          privacy: 'Privacy First',
          edge: 'Edge Computing',
        },
      },
      cta: {
        title: 'Ready to Manage Time Smarter?',
        subtitle: 'Start now and let AI be your personal schedule assistant',
        button: 'Start Smart Scheduling →',
      },
      footer: {
        tagline: 'Local-first AI smart schedule management · Make time your friend',
        links: {
          privacy: 'Privacy Policy',
          terms: 'Terms of Service',
          contact: 'Contact Us',
        },
      },
    },
  },
  'ja-JP': {
    waitlist: {
      title: 'エンドツーエンド暗号化同期（開発中）',
      description: 'あなたのデーターは神聖です。軍事グレード（AES-256）のクロスデバイス同期を構築しています。privlocal の開発者でさえ、あなたのカレンダーを見ることはできません。',
      expectedDate: '予定：2026年Q3',
      benefitsTitle: 'ウェイトリストに参加して取得：',
      benefitEarlyAccess: '✓ 早期アクセス（2週間先行）',
      benefitDiscount: '✓ 早期鳥割引（终身50%オフ）',
      benefitVoting: '✓ 機能投票権',
      emailPlaceholder: 'your@email.com',
      submitButton: 'ウェイトリストに参加',
      submitting: '送信中...',
      privacy: '🔒 お約束：メールは製品更新のみに使用し、第三方と共有しません。いつでも購読解除可能。',
      successTitle: 'ウェイトリストに追加されました！',
      successMessage: '機能が上线されたらすぐにお知らせします。ご支援ありがとうございます！',
      closeButton: '閉じる',
      errorInvalidEmail: '有効なメールアドレスを入力してください',
      errorSubmissionFailed: '送信に失敗しました。後でもう一度お試しください',
      errorNetwork: 'ネットワークエラー。後でもう一度お試しください',
    },
    landing: {
      nav: {
        features: '機能',
        comparison: '比較',
        testimonials: 'ユーザーレビュー',
        cta: '今すぐ体験 →',
      },
      hero: {
        badge: 'ローカルファースト · AI駆動 · プライバシー最優先',
        title: 'スマートスケジュール、',
        highlight: '効率的な管理',
        subtitle: '面倒なスケジュール管理にさようなら。AIインテリジェント解析、自然言語作成、Boss/秘書デュアルビュー、ローカルファーストストレージで、時間管理をよりスマートに、安全に、効率的に。',
        primaryButton: '今すぐ体験 →',
        secondaryButton: '詳しく見る',
      },
      stats: {
        efficiency: '効率向上',
        localStorage: 'ローカルストレージ',
        languages: '言語サポート',
        offline: 'オフライン対応',
      },
      features: {
        title: '強力な機能がすぐに使える',
        subtitle: 'すべての機能は、実際の問題を解決するために慎重に設計されています',
      },
      comparison: {
        title: '従来 vs AIスマートカレンダー',
        subtitle: 'AI Calendarがスケジュール管理をより効率的にする方法を見てみましょう',
        traditional: '従来のカレンダー',
        ai: 'AI Calendar',
        feature: '機能',
      },
      testimonials: {
        title: '実際のユーザーレビュー',
        subtitle: '彼らの声を聞いてみましょう',
      },
      screenshots: {
        title: 'シンプルで直感的 · 効率的な管理',
        subtitle: '慎重に設計されたインターフェースで、スケジュール管理を楽しみに',
      },
      privacy: {
        title: 'あなたのデータ、あなたの制御',
        text: '「エッジで計算、データはデバイスから離れない」原則を厳格に遵守。あなたのスケジュール、メモ、インスピレーションはローカルに保存され、機密情報はコンピュータから離れることはありません。',
        badges: {
          local: 'ローカルストレージ',
          offline: 'オフライン対応',
          privacy: 'プライバシー最優先',
          edge: 'エッジコンピューティング',
        },
      },
      cta: {
        title: 'よりスマートに時間を管理する準備はできましたか？',
        subtitle: '今すぐ始めて、AIをあなたの個人スケジュールアシスタントにしましょう',
        button: 'スマートスケジュールを始める →',
      },
      footer: {
        tagline: 'ローカルファーストのAIスマートスケジュール管理 · 時間を友達に',
        links: {
          privacy: 'プライバシーポリシー',
          terms: '利用規約',
          contact: 'お問い合わせ',
        },
      },
    },
  },
  'ko-KR': {
    waitlist: {
      title: '엔드투엔드 암호화 동기화 (개발중)',
      description: '당신의 데이터는神圣합니다. 군사등급 (AES-256) 크로스 디바이스 동기화를 구축하고 있습니다. privlocal 개발자조차도 당신의 캘린더를 볼 수 없습니다.',
      expectedDate: '출시 예정: 2026년 Q3',
      benefitsTitle: '대기 목록에 참여하여 얻는 것:',
      benefitEarlyAccess: '✓ 조기 액세스 (2주先行)',
      benefitDiscount: '✓ 얼리버드 할인 (평생 50% 할인)',
      benefitVoting: '✓ 기능 투표권',
      emailPlaceholder: 'your@email.com',
      submitButton: '대기 목록에 참여',
      submitting: '제출 중...',
      privacy: '🔒 약속: 이메일은 제품 업데이트 전용으로, 제3자와 공유하지 않습니다. 언제든지 구독 취소 가능.',
      successTitle: '대기 목록에 추가되었습니다!',
      successMessage: '기능이 출시되면 즉시 알려드립니다. 감사합니다!',
      closeButton: '닫기',
      errorInvalidEmail: '유효한 이메일 주소를 입력해 주세요',
      errorSubmissionFailed: '제출에 실패했습니다. 나중에 다시 시도해 주세요',
      errorNetwork: '네트워크 오류. 나중에 다시 시도해 주세요',
    },
    landing: {
      nav: {
        features: '기능',
        comparison: '비교',
        testimonials: '사용자 리뷰',
        cta: '지금 체험 →',
      },
      hero: {
        badge: '로컬 퍼스트 · AI 구동 · 프라이버시 우선',
        title: '스마트 스케줄,',
        highlight: '효율적인 관리',
        subtitle: '지루한 스케줄 관리와 작별하세요. AI 인텔리전트 파싱, 자연어 생성, Boss/비서 듀얼 뷰, 로컬 퍼스트 스토리지로 시간 관리를 더 스마트하고 안전하고 효율적으로 만듭니다.',
        primaryButton: '지금 체험 →',
        secondaryButton: '자세히 보기',
      },
      stats: {
        efficiency: '효율 향상',
        localStorage: '로컬 스토리지',
        languages: '언어 지원',
        offline: '오프라인 사용 가능',
      },
      features: {
        title: '강력한 기능이 손끝에',
        subtitle: '모든 기능은 실제 문제를 해결하기 위해 신중하게 설계되었습니다',
      },
      comparison: {
        title: '전통 vs AI 스마트 캘린더',
        subtitle: 'AI Calendar가 스케줄 관리를 더 효율적으로 만드는 방법을 확인하세요',
        traditional: '전통 캘린더',
        ai: 'AI Calendar',
        feature: '기능',
      },
      testimonials: {
        title: '실제 사용자 리뷰',
        subtitle: '그들의 이야기를 들어보세요',
      },
      screenshots: {
        title: '간단하고 직관적인 · 효율적인 관리',
        subtitle: '신중하게 설계된 인터페이스로 스케줄 관리가 즐거워집니다',
      },
      privacy: {
        title: '당신의 데이터, 당신의 제어',
        text: '「엣지에서 계산, 데이터는 기기에서 떠나지 않음」원칙을 엄격히 준수합니다. 당신의 스케줄, 메모, 영감은 로컬에 저장되고, 민감한 정보는 컴퓨터에서 떠나지 않습니다.',
        badges: {
          local: '로컬 스토리지',
          offline: '오프라인 사용 가능',
          privacy: '프라이버시 우선',
          edge: '엣지 컴퓨팅',
        },
      },
      cta: {
        title: '더 스마트하게 시간을 관리할 준비가 되셨나요?',
        subtitle: '지금 시작하고 AI를 개인 스케줄 어시스턴트로 만드세요',
        button: '스마트 스케줄 시작 →',
      },
      footer: {
        tagline: '로컬 퍼스트 AI 스마트 스케줄 관리 · 시간을 친구로',
        links: {
          privacy: '개인정보 처리방침',
          terms: '이용 약관',
          contact: '문의하기',
        },
      },
    },
  },
}

export function useTranslation(locale: SupportedLocale): Translations {
  return translations[locale] || translations['en-US']
}
