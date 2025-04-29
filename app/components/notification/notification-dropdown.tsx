"use client"

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger
} from '@/app/components/ui/dropdown-menu'
import { NotificationInterface } from '@/app/lib/models/notification'
import PaymentDialog from '@/app/splitwise/components/payment-dialog'

interface NotificationWithId extends NotificationInterface {
  _id: string;
}

type NotificationDropdownProps = {
  userId: string
}

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationWithId | null>(null)

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications?recipient=${userId}`)
      const data = await response.json()
      
      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.notifications.filter((notif: NotificationWithId) => !notif.read).length)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      })
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          ids.includes(notif._id) 
            ? { ...notif, read: true } 
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - ids.length))
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const handleNotificationClick = (notification: NotificationWithId) => {
    if (!notification.read) {
      markAsRead([notification._id])
    }
    
    if (notification.type === 'payment_request' || notification.type === 'split_bill') {
      setSelectedNotification(notification)
      setPaymentDialogOpen(true)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchNotifications()
      
      // Poll for notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => markAsRead(notifications.filter(n => !n.read).map(n => n._id))}
              >
                Mark all as read
              </Button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex justify-center py-4">
                <span className="text-muted-foreground">No notifications</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification._id}
                  className={`
                    px-4 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0
                    ${!notification.read ? 'bg-primary/5' : ''}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">
                      {notification.type === 'payment_request' && 'Payment Request'}
                      {notification.type === 'split_bill' && 'Split Bill'}
                      {notification.type === 'payment_received' && 'Payment Received'}
                      {notification.type === 'payment_sent' && 'Payment Sent'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm mb-1">{notification.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {notification.amount} {notification.asset}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      From: {notification.issuerName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedNotification && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          recipient={selectedNotification.issuerName}
          recipientWallet={selectedNotification.issuerWallet}
          amount={selectedNotification.amount}
          asset={selectedNotification.asset}
          description={selectedNotification.description}
        />
      )}
    </>
  )
} 