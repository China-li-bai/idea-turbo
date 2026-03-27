'use client'

import AppLayout from '@/components/ui/AppLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function AppPage() {
  return (
    <ErrorBoundary>
      <AppLayout />
    </ErrorBoundary>
  )
}
