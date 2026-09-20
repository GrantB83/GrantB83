import AccessCodesManager from './AccessCodesManager'

export const dynamic = 'force-dynamic'

export default function AccessCodesPage() {
  // Note: Staff auth check would go here in production
  // For now, page is accessible to anyone on /ops route
  
  return <AccessCodesManager />
}
