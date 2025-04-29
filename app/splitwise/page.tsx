"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Check, Plus, DollarSign, Users, Calculator, Loader2 } from "lucide-react"
import { toast } from "sonner"
import NotificationDropdown from "../components/notification/notification-dropdown"
import UserSearch from "./components/user-search"
import PaymentDialog from "./components/payment-dialog"
import { NotificationInterface } from "@/app/lib/models/notification"
import { Particles } from "@/app/components/particles"

type User = {
  _id: string
  username: string
  walletAddress: string
  displayName?: string
}

interface NotificationWithId extends NotificationInterface {
  _id: string;
  txHash?: string;
}

type SplitMethod = "equal" | "percentage"

export default function SplitwisePage() {
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  
  // State
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [duesNotifications, setDuesNotifications] = useState<NotificationWithId[]>([])
  const [paidNotifications, setPaidNotifications] = useState<NotificationWithId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationWithId | null>(null)
  
  // UI States
  const [activeTab, setActiveTab] = useState<string>("home")
  const [showCreateSplitDialog, setShowCreateSplitDialog] = useState(false)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<NotificationWithId | null>(null)
  
  // New split bill form state
  const [splitBill, setSplitBill] = useState({
    description: "",
    amount: "",
    splitMethod: "equal" as SplitMethod,
    percentages: {} as Record<string, number>,
  })
  
  // Fetch current user from localStorage
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoadingUser(true)
        
        // Get wallet address from localStorage
        if (typeof window !== 'undefined') {
          const walletAddress = localStorage.getItem('stellera_last_used_account')
          
          if (walletAddress) {
            // Fetch user details from API
            const response = await fetch(`/api/users/account?walletAddress=${encodeURIComponent(walletAddress)}`)
            const data = await response.json()
            
            if (data.user) {
              setCurrentUser(data.user)
            } else {
              // Create temporary user object if not found
              setCurrentUser({
                _id: walletAddress,
                username: `user_${walletAddress.substring(0, 8)}`,
                walletAddress,
                displayName: `User ${walletAddress.substring(0, 8)}...`,
              })
            }
          } else {
            // Use a placeholder if no wallet found
            setCurrentUser({
              _id: "guest-user",
              username: "guest",
              walletAddress: "PLACEHOLDER_WALLET_ADDRESS",
              displayName: "Guest User",
            })
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
        // Set fallback user
        setCurrentUser({
          _id: "guest-user",
          username: "guest",
          walletAddress: "PLACEHOLDER_WALLET_ADDRESS",
          displayName: "Guest User",
        })
      } finally {
        setIsLoadingUser(false)
      }
    }
    
    fetchCurrentUser()
  }, [])

  // Fetch dues notifications
  const fetchDuesNotifications = async () => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications/dues?recipient=${currentUser._id}`)
      const data = await response.json()
      
      if (data.dues) {
        setDuesNotifications(data.dues)
      }
      
      if (data.paid) {
        setPaidNotifications(data.paid)
      } else if (data.payments) {
        // Fallback for alternate API response format
        setPaidNotifications(data.payments)
      } else {
        // For debugging
        console.log("API response:", data)
      }
    } catch (error) {
      console.error('Error fetching dues notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle creating a split bill
  const handleCreateSplitBill = async () => {
    if (!currentUser) return
    
    const amount = parseFloat(splitBill.amount)
    if (isNaN(amount) || amount <= 0) return
    
    const totalParticipants = selectedUsers.length
    if (totalParticipants === 0) return
    
    setIsLoading(true)
    
    try {
      // Create notifications for each participant
      for (const user of selectedUsers) {
        // Calculate amount based on split method
        let participantAmount: number
        
        if (splitBill.splitMethod === "equal") {
          participantAmount = amount / (totalParticipants + 1) // +1 for current user
        } else {
          // Percentage-based
          const percentage = splitBill.percentages[user._id] || 0
          participantAmount = (amount * percentage) / 100
        }
        
        // Create notification
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient: user._id,
            type: 'split_bill',
            amount: participantAmount,
            asset: 'XLM',
            issuerWallet: currentUser.walletAddress,
            issuerName: currentUser.displayName || currentUser.username,
            description: splitBill.description,
            read: false,
          })
        })
      }
      
      // Reset form
      setShowCreateSplitDialog(false)
      setSplitBill({
        description: "",
        amount: "",
        splitMethod: "equal",
        percentages: {},
      })
      setSelectedUsers([])
      
      // Show success message with toast instead of alert
      toast.success("Split bill created successfully!")
    } catch (error) {
      console.error("Error creating split bill:", error)
      toast.error("Failed to create split bill. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUsers(prev => [...prev, user])
    
    // Initialize percentage to 0 for new users
    if (splitBill.splitMethod === "percentage") {
      setSplitBill(prev => ({
        ...prev,
        percentages: { ...prev.percentages, [user._id]: 0 }
      }))
    }
  }

  // Handle removing selected user
  const handleUserRemove = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user._id !== userId))
    
    // Remove percentage entry
    if (splitBill.splitMethod === "percentage") {
      const newPercentages = { ...splitBill.percentages }
      delete newPercentages[userId]
      setSplitBill(prev => ({
        ...prev,
        percentages: newPercentages
      }))
    }
  }

  // Handle percentage change for a participant
  const handlePercentageChange = (userId: string, percentage: number) => {
    setSplitBill(prev => ({
      ...prev,
      percentages: { ...prev.percentages, [userId]: percentage }
    }))
  }

  // Calculate if percentages sum to 100
  const isPercentageValid = () => {
    if (splitBill.splitMethod !== "percentage") return true
    
    // Include current user in percentage calculation
    const sum = Object.values(splitBill.percentages).reduce((acc, val) => acc + val, 0)
    return Math.abs(sum - 100) < 0.01 // Allow for floating point errors
  }

  // Handle initiating a payment
  const handlePayDue = (notification: NotificationWithId) => {
    setSelectedNotification(notification)
    setPaymentDialogOpen(true)
  }

  // Fetch notifications when tab changes or user loads
  useEffect(() => {
    if (currentUser && (activeTab === "pay" || activeTab === "home")) {
      fetchDuesNotifications()
    }
  }, [activeTab, currentUser])

  // Add notification polling when user changes
  useEffect(() => {
    if (currentUser) {
      // Initial fetch
      fetchDuesNotifications()
      
      // Set up polling every 20 seconds
      const interval = setInterval(() => {
        fetchDuesNotifications()
      }, 20000)
      
      // Clean up on unmount or when user changes
      return () => clearInterval(interval)
    }
  }, [currentUser])

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Particles />
      {/* Header with notification */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Splitwise</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Hi! {currentUser?.displayName ?? "Guest"}
          </span>
          {currentUser && <NotificationDropdown userId={currentUser._id} />}
        </div>
      </div>

      {activeTab === "home" ? (
        // Home screen with two options
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
          <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setActiveTab("pay")}>
            <CardHeader className="text-center pb-2">
              <DollarSign className="h-14 w-14 mx-auto mb-4 text-primary" />
              <CardTitle className="text-2xl">Pay Dues</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              View and pay your outstanding dues to friends
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setShowCreateSplitDialog(true)}>
            <CardHeader className="text-center pb-2">
              <Calculator className="h-14 w-14 mx-auto mb-4 text-primary" />
              <CardTitle className="text-2xl">Create Split Bill</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Split a new expense with your friends
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "pay" ? (
        // Pay Dues Screen
        <>
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => setActiveTab("home")}
          >
            Back to Home
          </Button>
          
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="current">Outstanding Dues</TabsTrigger>
              <TabsTrigger value="history">Paid Dues</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : duesNotifications.length === 0 ? (
                <div className="bg-white/10 rounded-xl border p-8 text-center">
                  <p className="text-muted-foreground">You don't have any outstanding dues.</p>
                </div>
              ) : (
                <>
                  {/* Outstanding Dues Summary */}
                  <div className="bg-amber-50/30 dark:bg-amber-900/20 border rounded-xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div>
                        <h3 className="text-lg font-medium">Outstanding Dues</h3>
                        <p className="text-sm text-muted-foreground">Bills waiting for your payment</p>
                      </div>
                      <div className="mt-3 md:mt-0">
                        <div className="text-2xl font-bold">
                          {duesNotifications.reduce((sum, notification) => sum + notification.amount, 0).toFixed(2)} XLM
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {duesNotifications.length} bill{duesNotifications.length !== 1 ? 's' : ''} to pay
                        </div>
                      </div>
                    </div>
                  </div>
                
                  <div className="bg-white/10 rounded-xl border overflow-hidden">
                    <div className="p-4 border-b bg-muted/50">
                      <div className="grid grid-cols-12 font-medium">
                        <div className="col-span-3">From</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-2">Amount</div>
                        <div className="col-span-3"></div>
                      </div>
                    </div>
                    
                    <div className="divide-y">
                      {duesNotifications.map((notification) => (
                        <div key={notification._id} className="p-4 grid grid-cols-12 items-center">
                          <div className="col-span-3 font-medium">{notification.issuerName}</div>
                          <div className="col-span-4 text-sm">{notification.description}</div>
                          <div className="col-span-2 font-medium">
                            {notification.amount} {notification.asset}
                          </div>
                          <div className="col-span-3 flex justify-end">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePayDue(notification)}
                            >
                              Pay Now
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="history">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : paidNotifications.length === 0 ? (
                <div className="bg-white/10 rounded-xl border p-8 text-center">
                  <p className="text-muted-foreground">No payment history available.</p>
                </div>
              ) : (
                <>
                  {/* Paid Dues Summary */}
                  <div className="bg-muted/30 border rounded-xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div>
                        <h3 className="text-lg font-medium">All Paid Dues</h3>
                        <p className="text-sm text-muted-foreground">Total dues you've successfully paid</p>
                      </div>
                      <div className="mt-3 md:mt-0">
                        <div className="text-2xl font-bold">
                          {paidNotifications.reduce((sum, notification) => sum + notification.amount, 0).toFixed(2)} XLM
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {paidNotifications.length} payment{paidNotifications.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                
                  <div className="bg-white/10 rounded-xl border overflow-hidden">
                    <div className="p-4 border-b bg-muted/50">
                      <div className="grid grid-cols-12 font-medium">
                        <div className="col-span-2">To</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-1">Amount</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-3">Transaction</div>
                      </div>
                    </div>
                    
                    <div className="divide-y">
                      {paidNotifications.map((notification) => (
                        <div 
                          key={notification._id} 
                          className="p-4 grid grid-cols-12 items-center hover:bg-muted/10 cursor-pointer"
                          onClick={() => {
                            setSelectedTransaction(notification);
                            setShowTransactionDetails(true);
                          }}
                        >
                          <div className="col-span-2 font-medium truncate" title={notification.issuerName}>
                            {notification.issuerName}
                          </div>
                          <div className="col-span-4 text-sm">
                            {notification.description}
                          </div>
                          <div className="col-span-1 font-medium whitespace-nowrap">
                            {notification.amount} {notification.asset}
                          </div>
                          <div className="col-span-2 text-sm text-muted-foreground">
                            <div>{new Date(notification.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(notification.createdAt).toLocaleTimeString()}</div>
                          </div>
                          <div className="col-span-3 text-xs">
                            {notification.txHash ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Hash:</span>
                                  <a 
                                    href={`https://stellar.expert/explorer/testnet/tx/${notification.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline truncate"
                                    title={notification.txHash}
                                    onClick={(e) => e.stopPropagation()} // Prevent row click when clicking link
                                  >
                                    {notification.txHash.substring(0, 8)}...{notification.txHash.substring(notification.txHash.length - 8)}
                                  </a>
                                </div>
                                <div className="text-muted-foreground">
                                  <span className="font-medium">Status:</span> {notification.status === 'paid' ? 'Completed' : notification.status || 'Completed'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No transaction data</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : null}
            {paidNotifications.length > 0 && activeTab === "home" && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {paidNotifications.slice(0, 3).map((notification) => {
              // Calculate time ago
              const timeAgo = (() => {
                const now = new Date();
                const notifDate = new Date(notification.createdAt);
                const diffMs = now.getTime() - notifDate.getTime();
                const diffSecs = Math.floor(diffMs / 1000);
                const diffMins = Math.floor(diffSecs / 60);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                
                if (diffDays > 0) return `${diffDays}d ago`;
                if (diffHours > 0) return `${diffHours}h ago`;
                if (diffMins > 0) return `${diffMins}m ago`;
                return `${diffSecs}s ago`;
              })();
              
              return (
                <div 
                  key={notification._id}
                  className="flex items-start p-3 bg-white/5 hover:bg-white/10 border rounded-lg transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedTransaction(notification);
                    setShowTransactionDetails(true);
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    notification.type === 'payment_sent'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                  }`}>
                    {notification.type === 'payment_sent' ? '↑' : '↓'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div className="font-medium truncate">
                        {notification.type === 'payment_sent' ? 'Payment Sent' : 'Payment Received'}
                      </div>
                      <div className="text-xs text-muted-foreground">{timeAgo}</div>
                    </div>
                    <div className="text-sm mt-1">
                      {notification.type === 'payment_sent'
                        ? `You paid ${notification.issuerName} ${notification.amount} ${notification.asset} for ${notification.description}`
                        : `${notification.issuerName} paid you ${notification.amount} ${notification.asset} for ${notification.description}`
                      }
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold">{notification.amount} {notification.asset}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {notification.type === 'payment_sent' ? 'To: ' : 'From: '}{notification.issuerName}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {paidNotifications.length > 3 && (
              <Button 
                variant="ghost" 
                className="w-full text-primary" 
                onClick={() => setActiveTab("pay")}
              >
                View all {paidNotifications.length} payments
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Create Split Bill Dialog */}
      <Dialog open={showCreateSplitDialog} onOpenChange={setShowCreateSplitDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Split Bill</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={splitBill.description}
                onChange={(e) => setSplitBill({...splitBill, description: e.target.value})}
                placeholder="Dinner, Movie, etc."
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (XLM)</Label>
              <Input
                id="amount"
                type="number"
                value={splitBill.amount}
                onChange={(e) => setSplitBill({...splitBill, amount: e.target.value})}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Split Method</Label>
              <RadioGroup 
                value={splitBill.splitMethod} 
                onValueChange={(value: string) => setSplitBill({...splitBill, splitMethod: value as SplitMethod})}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="equal" id="equal" />
                  <Label htmlFor="equal">Equal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage">Percentage</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid gap-2">
              <Label>Add Friends to Split</Label>
              <UserSearch 
                onUserSelect={handleUserSelect}
                selectedUsers={selectedUsers} 
                onUserRemove={handleUserRemove}
              />
              
              {selectedUsers.length > 0 && splitBill.splitMethod === "percentage" && (
                <div className="mt-4">
                  <Label className="mb-2 block">Percentage Split</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedUsers.map(user => (
                      <div key={user._id} className="flex items-center justify-between p-2 border rounded-md">
                        <span className="font-medium">{user.displayName || user.username}</span>
                        <div className="flex items-center">
                          <Input
                            type="number"
                            className="w-20 text-right"
                            min="0"
                            max="100"
                            value={splitBill.percentages[user._id] || 0}
                            onChange={(e) => handlePercentageChange(user._id, parseInt(e.target.value) || 0)}
                          />
                          <span className="ml-1">%</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Current user percentage */}
                    {currentUser && (
                      <div className="flex items-center justify-between p-2 border rounded-md">
                        <span className="font-medium">You ({currentUser.displayName || currentUser.username})</span>
                        <div className="flex items-center">
                          <Input
                            type="number"
                            className="w-20 text-right"
                            min="0"
                            max="100"
                            value={100 - Object.values(splitBill.percentages).reduce((acc, val) => acc + val, 0)}
                            disabled
                          />
                          <span className="ml-1">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span>Total:</span>
                    <span className={`font-medium ${isPercentageValid() ? 'text-green-600' : 'text-amber-600'}`}>
                      {Object.values(splitBill.percentages).reduce((acc, val) => acc + val, 0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              onClick={handleCreateSplitBill}
              disabled={
                isLoading ||
                !splitBill.description ||
                !splitBill.amount ||
                selectedUsers.length === 0 ||
                (splitBill.splitMethod === "percentage" && !isPercentageValid())
              }
            >
              {isLoading ? "Creating..." : "Create Split"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {currentUser && selectedNotification && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          recipient={selectedNotification.issuerName}
          recipientWallet={selectedNotification.issuerWallet}
          amount={selectedNotification.amount}
          asset={selectedNotification.asset}
          description={selectedNotification.description}
          onPaymentComplete={fetchDuesNotifications}
          notificationId={selectedNotification._id}
        />
      )}

      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4 py-2 border-b">
                <span className="font-medium text-muted-foreground col-span-1">Type</span>
                <span className="col-span-2 capitalize">
                  {selectedTransaction.type === 'payment_sent' ? 'Payment Sent' : selectedTransaction.type?.replace('_', ' ')}
                </span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4 py-2 border-b">
                <span className="font-medium text-muted-foreground col-span-1">Date & Time</span>
                <span className="col-span-2">
                  {new Date(selectedTransaction.createdAt).toLocaleDateString()} {new Date(selectedTransaction.createdAt).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4 py-2 border-b">
                <span className="font-medium text-muted-foreground col-span-1">Amount</span>
                <span className="col-span-2 font-bold">
                  {selectedTransaction.amount} {selectedTransaction.asset}
                </span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4 py-2 border-b">
                <span className="font-medium text-muted-foreground col-span-1">Recipient</span>
                <div className="col-span-2">
                  <div>{selectedTransaction.issuerName}</div>
                  <div className="text-xs text-muted-foreground truncate" title={selectedTransaction.issuerWallet}>
                    {selectedTransaction.issuerWallet}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4 py-2 border-b">
                <span className="font-medium text-muted-foreground col-span-1">Description</span>
                <span className="col-span-2">{selectedTransaction.description}</span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4 py-2 border-b">
                <span className="font-medium text-muted-foreground col-span-1">Status</span>
                <span className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTransaction.status === 'paid' || !selectedTransaction.status 
                      ? 'bg-green-100 text-green-800' 
                      : selectedTransaction.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedTransaction.status === 'paid' || !selectedTransaction.status ? 'Completed' : selectedTransaction.status}
                  </span>
                </span>
              </div>
              
              {selectedTransaction.txHash && (
                <div className="grid grid-cols-3 items-start gap-4 py-2 border-b">
                  <span className="font-medium text-muted-foreground col-span-1">Transaction Hash</span>
                  <div className="col-span-2 break-all text-xs font-mono">
                    {selectedTransaction.txHash}
                    <div className="mt-2">
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${selectedTransaction.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View on Stellar Explorer
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                onClick={() => setShowTransactionDetails(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 