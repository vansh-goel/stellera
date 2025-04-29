"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Input } from '@/app/components/ui/input'
import { CheckCircle } from 'lucide-react'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient: string
  recipientWallet: string
  amount: number
  asset: string
  description: string
}

export default function PaymentDialog({
  open,
  onOpenChange,
  recipient,
  recipientWallet,
  amount,
  asset,
  description
}: PaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [memo, setMemo] = useState(description)

  const handlePayment = async () => {
    try {
      setIsLoading(true)
      
      // TODO: Integrate with your Stellar payment system
      // This is a placeholder for the actual payment process
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Create a payment sent notification
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: 'currentUserId', // This should be the current user's ID
          type: 'payment_sent',
          amount,
          asset,
          issuerWallet: recipientWallet,
          issuerName: recipient,
          description: `You paid ${recipient} ${amount} ${asset} for ${description}`,
          read: true,
        })
      })
      
      setIsComplete(true)
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
      // Reset state after dialog closes
      setTimeout(() => {
        setIsComplete(false)
        setMemo(description)
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? 'Payment Complete' : 'Make Payment'}
          </DialogTitle>
        </DialogHeader>
        
        {isComplete ? (
          <div className="py-6 flex flex-col items-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-center">
              Your payment of {amount} {asset} to {recipient} was successful!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input id="recipient" value={recipient} disabled />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="wallet">Wallet Address</Label>
              <Input 
                id="wallet" 
                value={recipientWallet} 
                disabled 
                className="font-mono text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" value={amount.toString()} disabled />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="asset">Asset</Label>
                <Input id="asset" value={asset} disabled />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="memo">Memo/Description</Label>
              <Input 
                id="memo" 
                value={memo} 
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>
        )}
        
        <DialogFooter>
          {isComplete ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <Button 
              onClick={handlePayment} 
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Pay Now'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 