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

    // Get user role, default to 'user' if not set
    const userRole = (user.role || 'user').toLowerCase()
    
    console.log('NavBar - User role:', userRole, 'Full user:', { id: user.id, email: user.email, role: user.role })

    return <HamburgerMenu userRole={userRole} />
  } catch (error) {
    // Silently fail - navbar just won't show if there's an error
    console.error('NavBar error:', error)
    return null
  }
}
