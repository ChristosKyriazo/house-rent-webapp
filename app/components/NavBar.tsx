import { getCurrentUser } from '@/lib/auth'
import HamburgerMenu from './HamburgerMenu'
import RoleInitializer from './RoleInitializer'
import * as Sentry from '@sentry/nextjs'

// Force dynamic rendering to ensure fresh auth state
export const dynamic = 'force-dynamic'

export default async function NavBar() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return null
    }

    const userRole = (user.role || 'user').toLowerCase()
    const subscriptionTier = (user.subscriptionTier ?? 'free') as string
    const brokerCategory = (user.brokerCategory ?? 'standalone') as string
    return (
      <>
        <RoleInitializer userRole={userRole} brokerCategory={brokerCategory} />
        <HamburgerMenu userRole={userRole} subscriptionTier={subscriptionTier} brokerCategory={brokerCategory} />
      </>
    )
  } catch (error) {
    Sentry.captureException(error)
    return null
  }
}
