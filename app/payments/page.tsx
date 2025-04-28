"use client"

import React, { useState } from "react"
import { Button } from "@/app/components/ui/button"

type RecurringPayment = {
  id: string
  recipient: string
  recipientName?: string
  amount: string
  asset: string
  frequency: 'daily' | 'weekly' | 'monthly'
  startDate: string
  nextPaymentDate: string
  memo?: string
  active: boolean
}

type PaymentHistory = {
  id: string
  paymentId: string
  date: string
  status: 'completed' | 'failed'
  transactionId: string
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'create'>('scheduled')
  
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([
    {
      id: "p1",
      recipient: "GDTWL...3Z6A",
      recipientName: "Alex's Rent",
      amount: "500",
      asset: "USDC",
      frequency: "monthly",
      startDate: "2023-04-01",
      nextPaymentDate: "2023-05-01",
      memo: "Monthly rent payment",
      active: true
    },
    {
      id: "p2",
      recipient: "GDSHT...8FRW",
      recipientName: "Streaming Service",
      amount: "10",
      asset: "XLM",
      frequency: "monthly",
      startDate: "2023-03-15",
      nextPaymentDate: "2023-05-15",
      active: true
    },
    {
      id: "p3",
      recipient: "GDPQW...7TRG",
      amount: "5",
      asset: "XLM",
      frequency: "weekly",
      startDate: "2023-04-10",
      nextPaymentDate: "2023-05-01",
      memo: "Weekly savings",
      active: false
    }
  ])
  
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([
    {
      id: "h1",
      paymentId: "p1",
      date: "2023-04-01",
      status: "completed",
      transactionId: "c52a8ae5..."
    },
    {
      id: "h2",
      paymentId: "p2",
      date: "2023-04-15",
      status: "completed",
      transactionId: "8fd7e23a..."
    },
    {
      id: "h3",
      paymentId: "p3",
      date: "2023-04-24",
      status: "completed",
      transactionId: "9f3b1c7d..."
    },
    {
      id: "h4",
      paymentId: "p3",
      date: "2023-04-17",
      status: "completed",
      transactionId: "4a2e8f7c..."
    }
  ])
  
  const [newPayment, setNewPayment] = useState({
    recipient: "",
    recipientName: "",
    amount: "",
    asset: "XLM",
    frequency: "monthly" as RecurringPayment['frequency'],
    startDate: "",
    memo: ""
  })
  
  const togglePaymentStatus = (id: string) => {
    const updatedPayments = recurringPayments.map(payment => {
      if (payment.id === id) {
        return { ...payment, active: !payment.active }
      }
      return payment
    })
    setRecurringPayments(updatedPayments)
  }
  
  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real app, this would create a recurring payment through Stellar
    const now = new Date()
    let nextDate = new Date(newPayment.startDate)
    
    // Calculate next payment date based on frequency
    if (nextDate < now) {
      if (newPayment.frequency === 'daily') {
        nextDate = new Date(now.setDate(now.getDate() + 1))
      } else if (newPayment.frequency === 'weekly') {
        nextDate = new Date(now.setDate(now.getDate() + 7))
      } else if (newPayment.frequency === 'monthly') {
        nextDate = new Date(now.setMonth(now.getMonth() + 1))
      }
    }
    
    const newRecurringPayment: RecurringPayment = {
      id: `p${recurringPayments.length + 1}`,
      recipient: newPayment.recipient,
      recipientName: newPayment.recipientName || undefined,
      amount: newPayment.amount,
      asset: newPayment.asset,
      frequency: newPayment.frequency,
      startDate: newPayment.startDate,
      nextPaymentDate: nextDate.toISOString().split('T')[0],
      memo: newPayment.memo || undefined,
      active: true
    }
    
    setRecurringPayments([...recurringPayments, newRecurringPayment])
    setActiveTab('scheduled')
    
    // Reset form
    setNewPayment({
      recipient: "",
      recipientName: "",
      amount: "",
      asset: "XLM",
      frequency: "monthly",
      startDate: "",
      memo: ""
    })
  }
  
  const getFrequencyText = (frequency: RecurringPayment['frequency']) => {
    switch (frequency) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      default: return frequency
    }
  }
  
  const getPaymentHistory = (paymentId: string) => {
    return paymentHistory.filter(history => history.paymentId === paymentId)
  }
  
  return (
    <div className="container mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Payments</h1>
        <Button onClick={() => setActiveTab('create')}>Create New Payment</Button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'scheduled' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled Payments
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'create' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('create')}
        >
          Create Payment
        </button>
      </div>
      
      {/* Scheduled Payments */}
      {activeTab === 'scheduled' && (
        <div>
          {recurringPayments.length === 0 ? (
            <div className="text-center p-8 bg-muted/50 rounded-xl border">
              <p className="text-muted-foreground">You don't have any scheduled payments yet.</p>
              <Button 
                className="mt-4"
                onClick={() => setActiveTab('create')}
              >
                Create Payment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringPayments.map(payment => (
                <div key={payment.id} className="bg-white/10 rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">
                        {payment.recipientName || payment.recipient}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getFrequencyText(payment.frequency)} payment of {payment.amount} {payment.asset}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${payment.active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                        {payment.active ? 'Active' : 'Paused'}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => togglePaymentStatus(payment.id)}
                      >
                        {payment.active ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Payment Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Recipient:</span>
                            <span className="font-mono">{payment.recipient}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span>{payment.amount} {payment.asset}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Frequency:</span>
                            <span>{getFrequencyText(payment.frequency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Start Date:</span>
                            <span>{new Date(payment.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Next Payment:</span>
                            <span>{new Date(payment.nextPaymentDate).toLocaleDateString()}</span>
                          </div>
                          {payment.memo && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Memo:</span>
                              <span>{payment.memo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Payment History</h4>
                        <div className="space-y-2">
                          {getPaymentHistory(payment.id).map(history => (
                            <div key={history.id} className="flex justify-between items-center p-2 bg-muted/30 rounded-md text-xs">
                              <div>
                                <span className="text-muted-foreground mr-2">
                                  {new Date(history.date).toLocaleDateString()}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${history.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                                  {history.status}
                                </span>
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {history.transactionId}
                              </div>
                            </div>
                          ))}
                          
                          {getPaymentHistory(payment.id).length === 0 && (
                            <p className="text-sm text-muted-foreground">No payment history yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Create Payment */}
      {activeTab === 'create' && (
        <div>
          <div className="bg-white/10 rounded-xl border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Create Recurring Payment</h2>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient Stellar Address</label>
                  <input
                    type="text"
                    value={newPayment.recipient}
                    onChange={(e) => setNewPayment({...newPayment, recipient: e.target.value})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="G..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient Name (Optional)</label>
                  <input
                    type="text"
                    value={newPayment.recipientName}
                    onChange={(e) => setNewPayment({...newPayment, recipientName: e.target.value})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. Rent, Subscription, etc."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Asset</label>
                  <select
                    value={newPayment.asset}
                    onChange={(e) => setNewPayment({...newPayment, asset: e.target.value})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="XLM">XLM</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select
                    value={newPayment.frequency}
                    onChange={(e) => setNewPayment({...newPayment, frequency: e.target.value as RecurringPayment['frequency']})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={newPayment.startDate}
                  onChange={(e) => setNewPayment({...newPayment, startDate: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Memo (Optional)</label>
                <input
                  type="text"
                  value={newPayment.memo}
                  onChange={(e) => setNewPayment({...newPayment, memo: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add a description for this payment"
                />
              </div>
              
              <div className="bg-muted/30 p-4 rounded-md text-sm">
                <h4 className="font-medium mb-2">Payment Summary</h4>
                <p>
                  You are setting up a {getFrequencyText(newPayment.frequency).toLowerCase()} payment of{' '}
                  {newPayment.amount || '0'} {newPayment.asset} to {newPayment.recipientName || 'the recipient'}.
                </p>
                <p className="mt-2">
                  The first payment will be made on {newPayment.startDate ? new Date(newPayment.startDate).toLocaleDateString() : '[select date]'}.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Note: This will create a scheduled payment using the Stellar blockchain. You must have sufficient funds in your wallet when each payment is due.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveTab('scheduled')}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 