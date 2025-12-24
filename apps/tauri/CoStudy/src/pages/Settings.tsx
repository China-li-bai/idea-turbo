import { ArrowLeft, ChevronRight, Globe, Monitor, User, Bell, Clock, Beaker, RotateCcw, HelpCircle, Info, Shield, Cloud, Bug } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSettingsService, UserSettings } from "@/services/SettingsService";
import { useState, useEffect } from "react";


// 定义设置项类型
interface SettingItem {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleState?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  // 新增：下拉菜单属性
  hasDropdown?: boolean;
  dropdownItems?: Array<{
    label: string;
    value: string;
    isActive?: boolean;
    onClick: () => void;
  }>;
}

export function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // 状态管理
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 获取设置服务实例
  const settingsService = getSettingsService();

  // 加载用户设置
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const settings = await settingsService.getUserSettings(user.id);
        setUserSettings(settings);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载设置失败');
        console.error('加载用户设置失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSettings();
  }, [user, settingsService]);

  // 语言选项
  const languages = [
    { code: "en", name: "English" },
    { code: "zh", name: "中文" },
  ];

  // 当前语言显示名称
  const getCurrentLanguageName = () => {
    const currentLang = languages.find(lang => lang.code === (userSettings?.language || i18n.language)) || languages[0];
    return currentLang.name;
  };

  // 主题选项显示名称
  const getThemeDisplayName = () => {
    const currentTheme = userSettings?.theme || theme;
    switch (currentTheme) {
      case "light":
        return t("theme.light");
      case "dark":
        return t("theme.dark");
      case "system":
        return t("theme.system");
      default:
        return t("theme.system");
    }
  };

  // 处理登出
  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      alert(`登出失败: ${error.message}`);
    }
  };

  // 处理语言变更
  const handleLanguageChange = async (languageCode: string) => {
    // 先更新UI
    i18n.changeLanguage(languageCode);
    
    // 如果用户已登录，保存到数据库
    if (user) {
      try {
        const updatedSettings = await settingsService.updateLanguage(user.id, languageCode);
        setUserSettings(updatedSettings);
      } catch (err) {
        console.error('更新语言设置失败:', err);
        // 不显示错误给用户，因为UI已经更新了
      }
    }
  };

  // 处理主题变更
  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    // 先更新UI
    setTheme(newTheme);
    
    // 如果用户已登录，保存到数据库
    if (user) {
      try {
        const updatedSettings = await settingsService.updateTheme(user.id, newTheme);
        setUserSettings(updatedSettings);
      } catch (err) {
        console.error('更新主题设置失败:', err);
        // 不显示错误给用户，因为UI已经更新了
      }
    }
  };

  // 处理每日提醒开关
  const handleDailyRemindersToggle = async () => {
    if (!user) return;
    
    const newValue = !userSettings?.daily_reminders;
    
    try {
      const updatedSettings = await settingsService.updateDailyReminders(user.id, newValue);
      setUserSettings(updatedSettings);
    } catch (err) {
      console.error('更新每日提醒设置失败:', err);
      // 显示错误给用户
      alert('更新设置失败，请重试');
    }
  };

  // 处理提醒时间变更
  const handleReminderTimeChange = async () => {
    if (!user) return;
    
    // 简单的时间选择器，实际应用中可能需要更复杂的UI
    const newTime = prompt('请设置提醒时间 (格式: HH:MM)', userSettings?.reminder_time || '09:00');
    
    if (newTime && /^\d{2}:\d{2}$/.test(newTime)) {
      try {
        const updatedSettings = await settingsService.updateReminderTime(user.id, newTime);
        setUserSettings(updatedSettings);
      } catch (err) {
        console.error('更新提醒时间失败:', err);
        alert('更新设置失败，请重试');
      }
    } else if (newTime) {
      alert('时间格式不正确，请使用 HH:MM 格式');
    }
  };

  // 处理FSRS参数重置
  const handleResetFSRS = async () => {
    if (!user) return;
    
    const confirmed = window.confirm('确定要重置FSRS参数吗？这将影响您的学习算法。');
    
    if (confirmed) {
      try {
        const updatedSettings = await settingsService.resetFSRSParameters(user.id);
        setUserSettings(updatedSettings);
        alert('FSRS参数已重置为默认值');
      } catch (err) {
        console.error('重置FSRS参数失败:', err);
        alert('重置失败，请重试');
      }
    }
  };


  // 语言选项
  const languageOptions = languages.map(lang => ({
    label: lang.name,
    value: lang.code,
    isActive: (userSettings?.language || i18n.language) === lang.code,
    onClick: () => handleLanguageChange(lang.code)
  }));

  // 主题选项
  const themeOptions = [
    {
      label: t("theme.light"),
      value: "light",
      isActive: (userSettings?.theme || theme) === "light",
      onClick: () => handleThemeChange("light")
    },
    {
      label: t("theme.dark"),
      value: "dark",
      isActive: (userSettings?.theme || theme) === "dark",
      onClick: () => handleThemeChange("dark")
    },
    {
      label: t("theme.system"),
      value: "system",
      isActive: (userSettings?.theme || theme) === "system",
      onClick: () => handleThemeChange("system")
    }
  ];

  // 设置项数据
  const generalSettings: SettingItem[] = [
    {
      icon: <Globe className="h-5 w-5" />,
      label: t("settings.language"),
      value: getCurrentLanguageName(),
      hasDropdown: true,
      dropdownItems: languageOptions
    },
    {
      icon: <Monitor className="h-5 w-5" />,
      label: t("settings.appearance"),
      value: getThemeDisplayName(),
      hasDropdown: true,
      dropdownItems: themeOptions
    },
    {
      icon: <User className="h-5 w-5" />,
      label: t("settings.account"),
      onClick: () => console.log("Navigate to account settings")
    }
  ];

  const notificationSettings: SettingItem[] = [
    {
      icon: <Bell className="h-5 w-5" />,
      label: t("settings.dailyReminders"),
      hasToggle: true,
      toggleState: userSettings?.daily_reminders ?? true,
      onToggle: handleDailyRemindersToggle
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: t("settings.reminderTime"),
      value: userSettings?.reminder_time || "09:00",
      onClick: handleReminderTimeChange
    }
  ];

  const advancedSettings: SettingItem[] = [
    {
      icon: <Beaker className="h-5 w-5" />,
      label: t("settings.fsrsParameters"),
      onClick: () => console.log("Navigate to FSRS parameters")
    },
    {
      icon: <RotateCcw className="h-5 w-5" />,
      label: t("settings.resetFsrsProfile"),
      onClick: handleResetFSRS
    }
  ];

  const supportSettings: SettingItem[] = [
    {
      icon: <HelpCircle className="h-5 w-5" />,
      label: t("settings.helpFaq"),
      onClick: () => console.log("Navigate to help & FAQ")
    },
    {
      icon: <Info className="h-5 w-5" />,
      label: t("settings.about"),
      onClick: () => console.log("Navigate to about")
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: t("settings.privacyPolicy"),
      onClick: () => console.log("Navigate to privacy policy")
    }
  ];

  // 开发测试设置 (仅在开发环境显示)
  const isDevelopment = import.meta.env?.DEV;
  const developmentSettings: SettingItem[] = [
    {
      icon: <Bug className="h-5 w-5" />,
      label: "iOS14高级用户模拟测试",
      onClick: () => navigate("/ios14-test")
    }
  ];

  // 渲染设置区块
  const renderSettingsSection = (title: string, settings: SettingItem[]) => (
    <section className="mt-4">
      <h3 className="px-5 pb-2 pt-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mx-3 overflow-hidden rounded-xl bg-white dark:bg-slate-800/50">
        {settings.map((setting, index) => (
          <div
            key={index}
            className={`flex min-h-[3.5rem] items-center justify-between gap-4 border-b border-slate-200 px-4 dark:border-slate-700/50 ${index < settings.length - 1 ? "" : "border-b-0"
              }`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${setting.icon === <Beaker className="h-5 w-5" />
                ? "bg-yellow-500/20 text-yellow-500"
                : setting.icon === <RotateCcw className="h-5 w-5" />
                  ? "bg-red-500/20 text-red-500"
                  : "bg-primary/20 text-primary"
                }`}>
                {setting.icon}
              </div>
              <p className="flex-1 truncate text-base font-normal text-foreground">
                {setting.label}
              </p>
            </div>
            {setting.hasToggle ? (
              <button
                aria-checked={setting.toggleState}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark ${setting.toggleState
                  ? "bg-primary border-transparent"
                  : "bg-slate-300 dark:bg-slate-600 border-transparent"
                  }`}
                onClick={setting.onToggle}
                role="switch"
                type="button"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${setting.toggleState ? "translate-x-5" : "translate-x-0"
                    }`}
                ></span>
              </button>
            ) : setting.hasDropdown ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <span className="text-base font-medium text-muted-foreground">
                      {setting.value}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {setting.dropdownItems?.map((item, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={item.onClick}
                      className={item.isActive ? "bg-accent" : ""}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : setting.value ? (
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-muted-foreground">
                  {setting.value}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
      {/* FSRS重置警告 */}
      {title === t("settings.advanced") && (
        <p className="px-5 pt-2 text-xs text-muted-foreground">
          {t("settings.resetWarning")}
        </p>
      )}
    </section>
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background dark:bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/10 bg-background/80 px-4 py-3 backdrop-blur-sm dark:bg-background/80">
        <Link to="/" className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-foreground">
          {t("settings.title")}
        </h1>
        <div className="size-10 shrink-0"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-10" style={{ minHeight: 'max(884px, 100dvh)' }}>
        {renderSettingsSection(t("settings.general"), generalSettings)}
        {renderSettingsSection(t("settings.notifications"), notificationSettings)}

        {/* Supabase Sync Section */}
        <section className="mt-4">
          <h3 className="px-5 pb-2 pt-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            远程同步
          </h3>
          <div className="mx-3 overflow-hidden rounded-xl bg-white dark:bg-slate-800/50">
            <div className="flex min-h-[3.5rem] items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Cloud className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-normal text-foreground">
                    Supabase 同步
                  </p>
                  {user && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      已登录: {user.email}
                    </p>
                  )}
                </div>
              </div>
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  登出
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  登录
                </Button>
              )}
            </div>
            {!user && (
              <div className="px-4 pb-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  💡 登录后，您的数据将自动同步到云端
                </p>
              </div>
            )}
          </div>
        </section>

        {renderSettingsSection(t("settings.advanced"), advancedSettings)}
        {renderSettingsSection(t("settings.support"), supportSettings)}
        
        {/* 开发测试区域 - 仅在开发环境显示 */}
        {isDevelopment && renderSettingsSection("开发测试", developmentSettings)}
      </main>
    </div>
  );
}