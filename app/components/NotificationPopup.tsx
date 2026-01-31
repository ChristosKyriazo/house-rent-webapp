'use client'

import { useEffect } from 'react'
import { getTranslation } from '@/lib/translations'

interface NotificationPopupProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose: () => void
  language: 'el' | 'en'
}

export default function NotificationPopup({ type, message, onClose, language }: NotificationPopupProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000) // Auto-close after 4 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'info':
        return 'ℹ'
      default:
        return ''
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600/90 border-green-500'
      case 'error':
        return 'bg-red-600/90 border-red-500'
      case 'info':
        return 'bg-blue-600/90 border-blue-500'
      default:
        return 'bg-[#2D3748]/90 border-[#E8D5B7]/30'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      <div
        className={`${getBgColor()} backdrop-blur-sm rounded-2xl p-4 shadow-2xl border-2 min-w-[300px] max-w-md`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
            {getIcon()}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm mb-1">
              {type === 'success' && getTranslation(language, 'success')}
              {type === 'error' && getTranslation(language, 'error')}
              {type === 'info' && getTranslation(language, 'information')}
            </p>
            <p className="text-white/90 text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

