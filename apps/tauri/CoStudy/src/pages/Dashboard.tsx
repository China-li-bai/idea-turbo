import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Heart, Users, Database, Cloud, TestTube } from "lucide-react";
import { useDatabaseStatus } from "@/components/database/SmartDatabaseProvider";
import { getUserAuthorizationService } from "@/services/UserAuthorizationService";
import { isIOS14OrLower } from "@/services/PlatformDetectionService";

// New Services
import type {
  DashboardMetrics,
  RSDSummary,
  RetentionData,
} from "@/services/AnalyticsService";

// TODO: Refactor to use AnalyticsService
// Old analyticsSupabase service has been deleted
// import {
//   getDashboardMetrics,
//   getRsdSummary,
//   getRetentionNow,
//   type DashboardMetrics,
//   type RSDSummary,
// } from "@/services/analyticsSupabase";

// Removed temporary types
// type DashboardMetrics = any;
// type RSDSummary = any;

export function Dashboard() {
  const { t } = useTranslation();
  const { isLocalInitialized, isCloudOnly, hasUser } = useDatabaseStatus();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [rsd, setRsd] = useState<RSDSummary | null>(null);
  const [retention, setRetention] = useState<{ value: number; goal: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  // iOS14 高级用户测试模式
  const toggleTestMode = async () => {
    const authService = getUserAuthorizationService();
    const newTestMode = !isTestMode;
    
    if (newTestMode) {
      // 启用测试模式：模拟iOS14高级用户
      authService.setCurrentUser('test-ios14-premium-user');
      authService.setMockPremiumMode(true);
      console.log('[Dashboard] 测试模式：模拟iOS14高级用户，强制使用Supabase远程数据库');
    } else {
      // 关闭测试模式
      authService.setMockPremiumMode(false);
      authService.setCurrentUser(null);
      console.log('[Dashboard] 测试模式已关闭');
    }
    
    setIsTestMode(newTestMode);
    setLoading(true);
    
    // 重新加载数据以验证远程数据库连接
    await loadDashboardData();
  };

  const loadDashboardData = async () => {
    try {
      const { getAnalyticsService } = await import('@/services/AnalyticsService');
      const analyticsService = getAnalyticsService();

      const [m, r, k] = await Promise.all([
        analyticsService.getDashboardMetrics(),
        analyticsService.getRsdSummary(),
        analyticsService.getRetentionNow(),
      ]);

      setMetrics(m);
      setRsd(r);
      setRetention(k.length > 0 ? { value: k[0].retention / 100, goal: 0.9 } : { value: 0, goal: 0.9 });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await loadDashboardData();
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tomorrow = useMemo(() => {
    const next = metrics?.timeline7d?.[1];
    const avg = metrics?.timeline7d?.reduce((a, b) => a + b.count, 0) ?? 0;
    const avgPerDay = metrics?.timeline7d ? Math.round(avg / metrics.timeline7d.length) : 0;
    return {
      count: next?.count ?? 0,
      heavy: (next?.count ?? 0) > (avgPerDay || 0),
    };
  }, [metrics]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-4">{t("dashboard.noData")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        
        <div className="flex items-center gap-4">
          {/* iOS14 高级用户测试按钮 */}
          <Button
            onClick={toggleTestMode}
            variant={isTestMode ? "destructive" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isTestMode ? "关闭测试模式" : "iOS14高级用户测试"}
          </Button>

          {/* 数据库状态指示器 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isTestMode ? (
              <>
                <TestTube className="h-4 w-4 text-orange-500" />
                <span className="text-orange-500">iOS14测试模式</span>
              </>
            ) : isCloudOnly ? (
              <>
                <Cloud className="h-4 w-4" />
                <span>云端模式</span>
              </>
            ) : isLocalInitialized ? (
              <>
                <Database className="h-4 w-4" />
                <span>本地模式</span>
              </>
            ) : (
              <span>数据库未初始化</span>
            )}
          </div>
        </div>
      </div>

      {/* Single Big Number - Overall Retention */}
      <section className="rounded-xl border bg-background/60 p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{t("dashboard.retention.title")}</div>
            <div className="text-5xl font-semibold tracking-tight">
              {Math.round((retention?.value ?? 0) * 100)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.retention.goal", { goal: Math.round((retention?.goal ?? 0.9) * 100) })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">{t("dashboard.today.title")}</div>
            <div className="text-2xl font-medium">{metrics?.todayStates ? (metrics.todayStates.new + metrics.todayStates.learning + metrics.todayStates.review + metrics.todayStates.relearning) : 0}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("dashboard.today.minutes", { m: metrics?.todayMinutes ?? 0 })}</div>
          </div>
        </div>
      </section>

      {/* D/S/R mini cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-background/60 p-4">
          <div className="text-sm text-muted-foreground">{t("dashboard.rsd.retention")}</div>
          <div className="text-2xl font-semibold">{Math.round((rsd?.retention ?? 0) * 100)}%</div>
        </div>
        <div className="rounded-xl border bg-background/60 p-4">
          <div className="text-sm text-muted-foreground">{t("dashboard.rsd.stability")}</div>
          <div className="text-2xl font-semibold">{Math.round(rsd?.stabilityAvg ?? 0)}</div>
        </div>
        <div className="rounded-xl border bg-background/60 p-4">
          <div className="text-sm text-muted-foreground">{t("dashboard.rsd.difficulty")}</div>
          <div className="text-2xl font-semibold">{(rsd?.difficultyAvg ?? 0).toFixed(2)}</div>
        </div>
      </section>

      {/* 7-day Timeline */}
      <section className="rounded-xl border bg-background/60 p-6">
        <div className="mb-3 text-sm text-muted-foreground">{t("dashboard.timeline.title")}</div>
        <div className="grid grid-cols-7 gap-2">
          {metrics?.timeline7d?.map((d) => (
            <div key={d.date} className="flex flex-col items-center">
              <div
                className="w-6 rounded bg-primary/20"
                style={{ height: `${Math.min(120, 8 + d.count * 6)}px` }}
                title={`${d.count} ${t("dashboard.timeline.count")} · ${d.minutes} ${t("dashboard.timeline.minutes")}`}
              />
              <div className="mt-1 text-xs text-muted-foreground">{d.count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 7d Grades & Today States */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-background/60 p-6">
          <div className="mb-3 text-sm text-muted-foreground">{t("dashboard.grades.title")}</div>
          <ul className="grid grid-cols-4 gap-3 text-center">
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.grades.again")}</div>
              <div className="text-xl font-medium">{metrics?.gradeDist7d.again ?? 0}</div>
            </li>
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.grades.hard")}</div>
              <div className="text-xl font-medium">{metrics?.gradeDist7d.hard ?? 0}</div>
            </li>
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.grades.good")}</div>
              <div className="text-xl font-medium">{metrics?.gradeDist7d.good ?? 0}</div>
            </li>
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.grades.easy")}</div>
              <div className="text-xl font-medium">{metrics?.gradeDist7d.easy ?? 0}</div>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border bg-background/60 p-6">
          <div className="mb-3 text-sm text-muted-foreground">{t("dashboard.states.title")}</div>
          <ul className="grid grid-cols-3 gap-3 text-center">
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.states.new")}</div>
              <div className="text-xl font-medium">{metrics?.todayStates.new ?? 0}</div>
            </li>
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.states.learning")}</div>
              <div className="text-xl font-medium">{metrics?.todayStates.learning ?? 0}</div>
            </li>
            <li>
              <div className="text-xs text-muted-foreground">{t("dashboard.states.review")}</div>
              <div className="text-xl font-medium">{(metrics?.todayStates.review ?? 0) + (metrics?.todayStates.relearning ?? 0)}</div>
            </li>
          </ul>
        </div>
      </section>

      {/* Actionable CTA */}
      {tomorrow.heavy && (
        <section className="rounded-xl border bg-yellow-50 p-6 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t("dashboard.cta.title")}</div>
              <div className="text-sm text-muted-foreground">{t("dashboard.cta.desc", { n: tomorrow.count })}</div>
            </div>
            <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              {t("dashboard.cta.action")}
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{t("dashboard.cta.tip")}</div>
        </section>
      )}
    </div>
  );
}