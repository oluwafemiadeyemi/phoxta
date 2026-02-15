// ===========================================================================
// Designer Layout — SERVER component that forces dynamic rendering
// and wraps the client-side Refine provider in a Suspense boundary
// ===========================================================================
import { Suspense } from 'react'
import DesignerProvider from '@/components/designer/DesignerProvider'

export const dynamic = 'force-dynamic'

export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <DesignerProvider>
        {children}
      </DesignerProvider>
    </Suspense>
  )
}
