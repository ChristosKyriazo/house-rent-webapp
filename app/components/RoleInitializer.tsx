'use client'

import { useEffect } from 'react'
import { useRole } from '../contexts/RoleContext'

interface RoleInitializerProps {
  userRole: string
  brokerCategory?: string
}

export default function RoleInitializer({ userRole, brokerCategory }: RoleInitializerProps) {
  const { setActualRole, setBrokerCategory } = useRole()

  useEffect(() => {
    setActualRole(userRole)
  }, [userRole, setActualRole])

  useEffect(() => {
    if (brokerCategory) setBrokerCategory(brokerCategory)
  }, [brokerCategory, setBrokerCategory])

  return null
}













