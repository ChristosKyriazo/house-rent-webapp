'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import { useRole } from '../contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import FinalizeNotificationModal from './FinalizeNotificationModal'

interface Notification {
  id: number
  type: 'inquiry' | 'approved' | 'dismissed' | 'finalize'
  message: string
  homeKey: string
  inquiryId: number | null
  createdAt: string
}

export default function NotificationBell() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finalizeNotification, setFinalizeNotification] = useState<Notification | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Determine display role
  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || 'user')

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?language=${language}`)
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
        } else {
          // If unauthorized, user might not be logged in - that's ok
          if (response.status !== 401) {
            console.error('Error fetching notifications:', response.status)
          }
        }
      } catch (error) {
        // Silently handle errors - bell will still show
        console.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Refresh notifications every 10 minutes
    const interval = setInterval(fetchNotifications, 600000)
    return () => clearInterval(interval)
  }, [language])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false)
    if (notification.type === 'finalize') {
      setFinalizeNotification(notification)
    } else if (displayRole === 'owner' && notification.type === 'inquiry') {
      router.push(`/homes/inquiries/${notification.homeKey}`)
    } else if (notification.type === 'approved') {
      router.push('/homes/approved')
    } else if (notification.type === 'dismissed') {
      router.push('/homes/my-inquiries')
    } else if (notification.type === 'rate') {
      // Redirect to rating page based on role
      // Owner rates user, User rates owner
      if (displayRole === 'owner' || (actualRole === 'both' && selectedRole === 'owner')) {
        router.push('/homes/rate-user')
      } else {
        router.push('/homes/rate-owner')
      }
    }
  }

  const handleFinalizeClose = () => {
    setFinalizeNotification(null)
  }

  const handleFinalizeApprove = () => {
    if (finalizeNotification) {
      setNotifications(notifications.filter(n => n.id !== finalizeNotification.id))
      setFinalizeNotification(null)
    }
  }

  const handleFinalizeDismiss = () => {
    if (finalizeNotification) {
      setNotifications(notifications.filter(n => n.id !== finalizeNotification.id))
      setFinalizeNotification(null)
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const unreadCount = notifications.length

  // Always render the notification bell - don't hide it
  return (
    <div className="relative pointer-events-auto" ref={notificationRef} style={{ isolation: 'isolate' }}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="relative px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-0.5 pointer-events-auto h-[40px] flex items-center justify-center"
        aria-label="Notifications"
        style={{ pointerEvents: 'auto', isolation: 'isolate' }}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#2D3748]"
        >
          <path 
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M13.73 21a2 2 0 0 1-3.46 0" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-[#2D3748]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-14 right-0 w-80 bg-[#1A202C]/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-[#E8D5B7]/20 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-[#E8D5B7]/20 bg-[#2D3748]/50">
            <h3 className="text-lg font-bold text-[#E8D5B7]">
              {getTranslation(language, 'notifications')}
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#E8D5B7]/70">
                {getTranslation(language, 'loading')}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-[#E8D5B7]/70">
                {getTranslation(language, 'noNotifications')}
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="p-4 border-b border-[#E8D5B7]/10 hover:bg-[#2D3748]/50 transition-colors cursor-pointer group relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-[#E8D5B7] group-hover:text-[#D4C19F] transition-colors">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#E8D5B7]/60 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString(
                          language === 'el' ? 'el-GR' : 'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E8D5B7]/70 hover:text-red-400 text-lg"
                      aria-label="Delete notification"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Finalize Notification Modal */}
      {finalizeNotification && (
        <FinalizeNotificationModal
          notification={finalizeNotification}
          onClose={handleFinalizeClose}
          onApprove={handleFinalizeApprove}
          onDismiss={handleFinalizeDismiss}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

