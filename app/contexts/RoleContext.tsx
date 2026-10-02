'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type SelectedRole = 'owner' | 'user'

interface RoleContextType {
  selectedRole: SelectedRole | null
  setSelectedRole: (role: SelectedRole) => void
  actualRole: string | null // 'owner', 'user', 'both', or 'broker'
  setActualRole: (role: string) => void
  brokerCategory: string | null // 'standalone' | 'parent' (Main) | 'child' (Default under a Main)
  setBrokerCategory: (category: string) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [selectedRole, setSelectedRoleState] = useState<SelectedRole | null>(null)
  const [actualRole, setActualRoleState] = useState<string | null>(null)
  const [brokerCategory, setBrokerCategoryState] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load selected role from localStorage on mount
    const savedRole = localStorage.getItem('selectedRole') as SelectedRole | null
    if (savedRole === 'owner' || savedRole === 'user') {
      setSelectedRoleState(savedRole)
    }
    setMounted(true)
  }, [])

  const setSelectedRole = (role: SelectedRole) => {
    setSelectedRoleState(role)
    if (mounted) {
      localStorage.setItem('selectedRole', role)
    }
  }

  const setActualRole = (role: string) => {
    const normalizedRole = role.toLowerCase()
    setActualRoleState(normalizedRole)
    
    // If user is not "both", clear selected role
    if (normalizedRole !== 'both') {
      setSelectedRoleState(null)
      if (mounted) {
        localStorage.removeItem('selectedRole')
      }
    }
  }

  const setBrokerCategory = (category: string) => {
    setBrokerCategoryState(category.toLowerCase())
  }

  // Initialize selected role when actualRole becomes "both"
  useEffect(() => {
    if (mounted && actualRole === 'both' && !selectedRole) {
      const savedRole = localStorage.getItem('selectedRole') as SelectedRole | null
      if (savedRole === 'owner' || savedRole === 'user') {
        setSelectedRoleState(savedRole)
      } else {
        // Default to 'user' if no saved role
        setSelectedRoleState('user')
        localStorage.setItem('selectedRole', 'user')
      }
    }
  }, [mounted, actualRole, selectedRole])

  return (
    <RoleContext.Provider value={{ selectedRole, setSelectedRole, actualRole, setActualRole, brokerCategory, setBrokerCategory }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

