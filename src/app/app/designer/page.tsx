// ===========================================================================
// Designer Dashboard Page — SERVER component wrapper
// Forces dynamic rendering to prevent prerendering issues with Refine's
// internal useSearchParams() usage.
// ===========================================================================
import { Suspense } from 'react'
import DesignerDashboardClient from '@/components/designer/DesignerDashboard'

export const dynamic = 'force-dynamic'

export default function DesignerDashboardPage() {
  return (
    <Suspense>
      <DesignerDashboardClient />
    </Suspense>
  )
}
