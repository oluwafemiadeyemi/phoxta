'use client'

import dynamic from 'next/dynamic'

// Dynamically import the CRM app to avoid SSR issues with react-router
const CrmApp = dynamic(() => import('@crm/App'), { ssr: false })

export default function CrmPage() {
  return (
    <div className="crm-root" style={{ minHeight: '100vh' }}>
      <CrmApp />
    </div>
  )
}
