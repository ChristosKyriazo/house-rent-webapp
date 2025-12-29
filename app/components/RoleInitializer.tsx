'use client'

import { useEffect } from 'react'
import { useRole } from '../contexts/RoleContext'

interface RoleInitializerProps {
  userRole: string
}

export default function RoleInitializer({ userRole }: RoleInitializerProps) {
  const { setActualRole } = useRole()

  useEffect(() => {
    setActualRole(userRole)
  }, [userRole, setActualRole])

  return null
}




