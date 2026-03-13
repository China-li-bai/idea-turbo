import { CalendarView } from "@/components/CalendarView";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Calendar</h1>
          <p className="text-gray-600 mt-2">智能日历 - 本地优先的日程管理</p>
        </header>
        
        <CalendarView />
      </div>
    </main>
  );
}
