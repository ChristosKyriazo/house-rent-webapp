'use client'

import NavBarWrapper from './NavBarWrapper'

export default function ConditionalNavBar({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBarWrapper />
      {children}
    </>
  )
}
