'use client'

import dynamic from 'next/dynamic'
import { useCalendarStore } from "@/lib/stores/calendarStore"

const CalendarView = dynamic(() => import('@/components/CalendarView'), { ssr: false })
const ViewModeSelector = dynamic(() => import('@/components/ViewModeSelector'), { ssr: false })
const InspirationCapture = dynamic(() => import('@/components/InspirationCapture'), { ssr: false })
const EventConflictDetector = dynamic(() => import('@/components/EventConflictDetector'), { ssr: false })

export default function AppPage() {
  const { events, settings } = useCalendarStore()
  
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <ViewModeSelector />
      </div>
      
      {settings.viewMode === 'boss' && (
        <div className="mb-6">
          <EventConflictDetector 
            events={events} 
            selectedDate={new Date()}
          />
        </div>
      )}
      
      <CalendarView />
      
      <InspirationCapture />
    </>
  )
}
