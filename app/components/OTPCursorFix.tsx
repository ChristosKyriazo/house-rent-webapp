'use client'

import { useEffect } from 'react'

export default function OTPCursorFix() {
  useEffect(() => {
    // Function to focus the first OTP input
    const focusFirstOTPInput = () => {
      // Try multiple times with increasing delays to catch Clerk's dynamic rendering
      const attempts = [50, 100, 200, 300, 500, 1000]
      
      attempts.forEach((delay) => {
        setTimeout(() => {
          // Find all OTP inputs
          const inputs = document.querySelectorAll('input[data-input-otp="true"]') as NodeListOf<HTMLInputElement>
          
          if (inputs.length > 0) {
            const firstInput = inputs[0]
            // Only focus if no input is currently focused or if the focused one is not the first
            const currentlyFocused = document.activeElement as HTMLInputElement
            if (!currentlyFocused || currentlyFocused !== firstInput) {
              firstInput.focus()
              // Also try to set cursor position to start
              firstInput.setSelectionRange(0, 0)
            }
          }
        }, delay)
      })
    }

    // Try to focus immediately
    focusFirstOTPInput()

    // Also try when the DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', focusFirstOTPInput)
    } else {
      focusFirstOTPInput()
    }

    // Watch for OTP inputs being added dynamically
    const observer = new MutationObserver(() => {
      const inputs = document.querySelectorAll('input[data-input-otp="true"]') as NodeListOf<HTMLInputElement>
      if (inputs.length > 0) {
        const firstInput = inputs[0]
        const currentlyFocused = document.activeElement as HTMLInputElement
        // Only focus first input if nothing is focused or something else is focused
        if (!currentlyFocused || (currentlyFocused !== firstInput && !currentlyFocused.hasAttribute('data-input-otp'))) {
          firstInput.focus()
          firstInput.setSelectionRange(0, 0)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      document.removeEventListener('DOMContentLoaded', focusFirstOTPInput)
    }
  }, [])

  return null
}

