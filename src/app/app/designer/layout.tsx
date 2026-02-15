'use client'

// ===========================================================================
// Designer Layout — wraps all designer routes with Refine + TooltipProvider
// ===========================================================================
import { Suspense } from 'react'
import { Refine } from '@refinedev/core'
import { dataProvider } from '@refinedev/supabase'
import routerProvider from '@refinedev/nextjs-router'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { TooltipProvider } from '@/components/ui/tooltip'

const supabaseClient = createBrowserSupabaseClient()

export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <Refine
        dataProvider={dataProvider(supabaseClient)}
        routerProvider={routerProvider}
        resources={[
          { name: 'design_projects' },
          { name: 'design_pages' },
          { name: 'design_assets' },
          { name: 'design_brand_kits' },
          { name: 'design_collaborators' },
          { name: 'design_comments' },
          { name: 'design_versions' },
        ]}
        options={{ disableTelemetry: true }}
      >
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </Refine>
    </Suspense>
  )
}
