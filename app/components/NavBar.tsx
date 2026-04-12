import { getCurrentUser } from '@/lib/auth'
import HamburgerMenu from './HamburgerMenu'
import RoleInitializer from './RoleInitializer'

// Force dynamic rendering to ensure fresh auth state
export const dynamic = 'force-dynamic'

export default async function NavBar() {
  try {
    const user = await getCurrentUser()

    // If no user, show a guest hamburger menu with only Profile -> Login
    if (!user) {
      return <HamburgerMenu userRole="guest" />
    }

    const userRole = (user.role || 'user').toLowerCase()
    return (
      <>
        <RoleInitializer userRole={userRole} />
        <HamburgerMenu userRole={userRole} />
      </>
    )
  } catch (error) {
    // Silently fail - navbar just won't show if there's an error
    console.error('NavBar error:', error)
    return <HamburgerMenu userRole="guest" />
  }
}
