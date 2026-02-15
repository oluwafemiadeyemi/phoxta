'use client'

// ===========================================================================
// Designer Layout — uses next/dynamic with ssr:false to completely prevent
// Refine's RouteChangeHandler (which uses useSearchParams) from running
// during Next.js static prerendering.
// ===========================================================================
import dynamic from 'next/dynamic'

const DesignerProvider = dynamic(
  () => import('@/components/designer/DesignerProvider'),
  { ssr: false }
)

export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  return <DesignerProvider>{children}</DesignerProvider>
}
