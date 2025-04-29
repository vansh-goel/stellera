"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Input } from '@/app/components/ui/input'
import { CheckCircle, Loader2, CoinsIcon } from 'lucide-react'
import { useWallet } from '@/app/providers/wallet-provider'
import { createPaymentTransaction, submitTransaction } from '@/lib/stellar-transactions'
import { toast } from 'sonner'
import StellarSdk from '@stellar/stellar-sdk'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient: string
  recipientWallet: string
  amount: number
  asset: string
  description: string
  onPaymentComplete?: () => void
  notificationId?: string
}

export default function PaymentDialog({
  open,
  onOpenChange,
  recipient,
  recipientWallet,
  amount,
  asset,
  description,
  onPaymentComplete,
  notificationId
}: PaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [memo, setMemo] = useState(description)
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [rewardEarned, setRewardEarned] = useState<number | null>(null)
  
  // Get wallet provider functions
  const { wallet, isConnected, publicKey, sign, currentAccount } = useWallet()

  // Track the spending for SLR rewards
  const trackRewardSpending = async (txHash: string, amount: number, description: string) => {
    try {
      // Get current user ID from localStorage
      const walletAddress = typeof window !== 'undefined' ? 
        localStorage.getItem('stellera_last_used_account') : publicKey;
      
      if (!walletAddress) return null;
      
      // Only track if the asset is XLM
      if (asset.toLowerCase() !== 'xlm') return null;
      
      // Call the rewards API to track spending
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          txHash,
          xlmAmount: amount,
          description
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to track rewards');
      }
      
      const data = await response.json();
      
      // Return the SLR tokens issued (if any)
      return data.slrIssued > 0 ? data.slrIssued : null;
    } catch (error) {
      console.error('Error tracking rewards:', error);
      return null;
    }
  };

  const handlePayment = async () => {
    if (!isConnected || !publicKey || !sign || !currentAccount) {
      toast.error("Wallet not connected. Please connect your wallet first.")
      return
    }

    try {
      setIsLoading(true)
      setTransactionError(null)
      
      // Check that we have all necessary data
      if (!recipientWallet) {
        throw new Error("Recipient wallet address is missing")
      }
      
      // Validate amount
      const amountToSend = amount.toString()
      if (parseFloat(amountToSend) <= 0) {
        throw new Error("Amount must be greater than 0")
      }
      
      // Create payment transaction
      const { transaction, network_passphrase } = await createPaymentTransaction({
        source: publicKey,
        destination: recipientWallet,
        amount: amountToSend,
        asset: "native", // Currently only supporting XLM
        memo: memo || description
      })
      
      // Sign transaction with wallet
      const signedTransaction = await sign({
        transactionXDR: transaction,
        network: network_passphrase,
        pincode: "1234" // In a real app, this would be user input
      })
      
      // Submit transaction to network
      const result = await submitTransaction(signedTransaction)
      
      // Check the payment status
      if (result && result.successful) {
        toast.success("Payment completed successfully!")
        
        // Get current user ID from localStorage
        const walletAddress = typeof window !== 'undefined' ? 
          localStorage.getItem('stellera_last_used_account') : null
        
        // Create a payment sent notification
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient: walletAddress || publicKey, // Current user's wallet address
            type: 'payment_sent',
            amount,
            asset,
            issuerWallet: recipientWallet,
            issuerName: recipient,
            description: `You paid ${recipient} ${amount} ${asset} for ${description}`,
            read: true,
            txHash: result.hash,
            status: 'paid'
          })
        })
        
        // Mark the notification as read and set as paid if we have an ID
        if (notificationId) {
          await fetch(`/api/notifications/${notificationId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'paid',
              read: true,
              txHash: result.hash
            })
          })
        }
        
        // Track spending for SLR rewards
        if (asset.toLowerCase() === 'xlm') {
          const slrIssued = await trackRewardSpending(result.hash, amount, description);
          if (slrIssued) {
            setRewardEarned(slrIssued);
          }
        }
        
        setIsComplete(true)
        
        // Call the onPaymentComplete callback if provided
        if (onPaymentComplete) {
          onPaymentComplete();
        }
      } else {
        throw new Error("Transaction failed to complete")
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      setTransactionError(error.message || "Transaction failed. Please try again.")
      toast.error(`Payment failed: ${error.message || "Unknown error"}`)
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
        setTransactionError(null)
        setRewardEarned(null)
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
            
            {rewardEarned && asset.toLowerCase() === 'xlm' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <CoinsIcon className="h-5 w-5 text-amber-500 mr-2" />
                  <span className="font-medium">Rewards Earned!</span>
                </div>
                <p className="text-sm">
                  You've earned {rewardEarned} SLR for this transaction.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Visit the Rewards section to view your SLR balance.
                </p>
              </div>
            )}
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
            
            {asset.toLowerCase() === 'xlm' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm flex items-start">
                <CoinsIcon className="h-4 w-4 text-amber-500 mr-2 mt-0.5" />
                <div>
                  <p>You'll earn 1 SLR token for every 100 XLM spent.</p>
                  <p className="text-xs text-muted-foreground mt-1">SLR tokens can be used for rewards and discounts.</p>
                </div>
              </div>
            )}
            
            {!isConnected && (
              <div className="p-3 bg-amber-100 text-amber-800 rounded-md text-sm">
                Please connect your wallet to make payments.
              </div>
            )}
            
            {transactionError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
                {transactionError}
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          {isComplete ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <Button 
              onClick={handlePayment} 
              disabled={isLoading || !isConnected}
              className="relative"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 