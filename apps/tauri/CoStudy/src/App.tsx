/**
 * App.tsx - 主应用入口
 * 遵循Linus × Jobs标准：
 * - Linus: 消除不必要的状态管理，让数据结构更简单
 * - Jobs: 直接展示核心功能，移除明显的噪音元素
 */

import "./App.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { StudyRoomProvider } from "./contexts/StudyRoomContext";
import { SmartDatabaseProvider } from "./components/database/SmartDatabaseProvider";
import { StudyRoom } from "./components/study-room/StudyRoom";
import { PhilosophyBackground } from "./components/study-room/PhilosophyBackground";
import { DeckList } from "./pages/DeckList";
import BulkImport from "./pages/BulkImport";
import { Dashboard } from "./pages/Dashboard";
import { DeckDetail } from "./pages/DeckDetail";
import { FlashcardReview } from "./pages/FlashcardReview";
import { CardEditor } from "./pages/CardEditor";
import { Settings } from "./pages/Settings";
import { AuthPage } from "./pages/AuthPage";
import { AuthCallback } from "./pages/AuthCallback";
import { PhilosophyPage } from "./pages/PhilosophyPage";
import { SubscriptionOnboarding } from "./components/subscription/SubscriptionOnboarding";
import { SyncPage } from "./pages/SyncPage";
import { iOS14SimulationTest } from "./pages/iOS14SimulationTest";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute, AuthRedirect } from "./components/auth/ProtectedRoute";

/**
 * Linus原则: 智能数据库初始化（iOS14友好）
 * 根据用户状态动态决定数据库初始化策略，避免不必要的资源消耗
 * 移除SyncManager以防iOS14设备触发数据库初始化
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* 根路径重定向到首页 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 公共路由 - 不需要登录 */}
          <Route path="/auth" element={
            <AuthRedirect>
              <AuthPage />
            </AuthRedirect>
          } />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* iOS14测试页面 - 独立于数据库提供者，避免数据库初始化 */}
          <Route path="/ios14-test" element={
            <ProtectedRoute>
              <iOS14SimulationTest />
            </ProtectedRoute>
          } />
          
          {/* 其他路由需要数据库提供者 */}
          <Route path="*" element={
            <SmartDatabaseProvider>
              <Routes>
                {/* 全屏受保护路由 - 需要登录但不使用 AppShell */}
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <SubscriptionOnboarding />
                  </ProtectedRoute>
                } />
                <Route path="/sync" element={
                  <ProtectedRoute>
                    <SyncPage />
                  </ProtectedRoute>
                } />
                
                {/* 带导航的受保护路由 - 需要登录且使用 AppShell */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <AppShell>
                      <StudyRoomProvider>
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/philosophy" element={<PhilosophyPage />} />
                          <Route path="/import" element={<BulkImport />} />
                          <Route path="/decks" element={<DeckList />} />
                          <Route path="/decks/:deckId/cards" element={<DeckDetail />} />
                          <Route path="/decks/:deckId/cards/new" element={<CardEditor />} />
                          <Route path="/decks/:deckId" element={<FlashcardReview />} />
                          <Route path="/settings" element={<Settings />} />
                        </Routes>
                      </StudyRoomProvider>
                    </AppShell>
                  </ProtectedRoute>
                } />
              </Routes>
            </SmartDatabaseProvider>
          } />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
