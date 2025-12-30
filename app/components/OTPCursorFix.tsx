'use client'

import { useEffect } from 'react'

export default function OTPCursorFix() {
  useEffect(() => {
    // Just fix the visual cursor to show in the first box where typing actually happens
    const fixCursorVisual = () => {
      const inputs = document.querySelectorAll('input[data-input-otp="true"]') as NodeListOf<HTMLInputElement>
      
      if (inputs.length === 0) return
      
      const firstInput = inputs[0]
      const currentlyFocused = document.activeElement as HTMLInputElement
      
      // If first input is the one receiving input, make sure cursor is visible there
      if (currentlyFocused === firstInput || (!currentlyFocused && firstInput)) {
        // Ensure first input shows cursor
        firstInput.style.caretColor = '#E8D5B7'
        
        // Hide cursor on other inputs
        inputs.forEach((input, index) => {
          if (index > 0) {
            input.style.caretColor = 'transparent'
          }
        })
      }
    }

    // Watch for focus changes and fix cursor visual
    const handleFocus = () => {
      fixCursorVisual()
    }

    // Watch for OTP inputs being added
    const observer = new MutationObserver(() => {
      fixCursorVisual()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Listen for focus events
    document.addEventListener('focus', handleFocus, true)
    document.addEventListener('focusin', handleFocus, true)

    // Initial fix
    fixCursorVisual()
    const interval = setInterval(fixCursorVisual, 100)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      document.removeEventListener('focus', handleFocus, true)
      document.removeEventListener('focusin', handleFocus, true)
    }
  }, [])

  return null
}

