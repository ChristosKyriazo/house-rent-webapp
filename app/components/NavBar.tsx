import { getCurrentUser } from '@/lib/auth'
import HamburgerMenu from './HamburgerMenu'
import RoleInitializer from './RoleInitializer'

// Force dynamic rendering to ensure fresh auth state
export const dynamic = 'force-dynamic'

export default async function NavBar() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return null
    }

    const userRole = (user.role || 'user').toLowerCase()
    return (
      <>
        <RoleInitializer userRole={userRole} />
        <HamburgerMenu userRole={userRole} />
      </>
    )
  } catch (error) {
    console.error('NavBar error:', error)
    return null
  }
}
