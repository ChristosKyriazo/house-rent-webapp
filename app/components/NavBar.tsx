import { getCurrentUser } from '@/lib/auth'
import HamburgerMenu from './HamburgerMenu'

// Force dynamic rendering to ensure fresh auth state
export const dynamic = 'force-dynamic'

export default async function NavBar() {
  try {
    const user = await getCurrentUser()

    // Show navbar only when user is logged in
    if (!user) {
      return null
    }

    const userRole = (user.role || 'user').toLowerCase()
    return <HamburgerMenu userRole={userRole} />
  } catch (error) {
    // Silently fail - navbar just won't show if there's an error
    console.error('NavBar error:', error)
    return null
  }
}
