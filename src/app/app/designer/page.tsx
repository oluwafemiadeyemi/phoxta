'use client'

// ===========================================================================
// Designer Dashboard Page — uses next/dynamic with ssr:false to completely
// skip server-side rendering and avoid useSearchParams prerender errors.
// ===========================================================================
import dynamic from 'next/dynamic'

const DesignerDashboardClient = dynamic(
  () => import('@/components/designer/DesignerDashboard'),
  { ssr: false }
)

export default function DesignerDashboardPage() {
  return <DesignerDashboardClient />
}
