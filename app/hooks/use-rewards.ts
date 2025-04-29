import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/app/providers/wallet-provider'
import { toast } from 'sonner'
import { Horizon, Asset } from '@stellar/stellar-sdk'
import { createPaymentTransaction, submitTransaction } from '@/lib/stellar-transactions'

// Constants for SLR token
const SLR_ASSET_CODE = "SLR"
const SLR_ISSUER_WALLET = "GCCVGVJDVDWV6ETFXNQEKWXJBG3TJVLWLG6NZCQ4XW3L2FKANVDTGHEP" // This would be replaced with the actual issuer in production
const SLR_REWARD_RATE = 100 // 1 SLR for every 100 XLM spent

type UserBalance = {
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  balance: string
}

type RewardTransaction = {
  id: string
  txHash: string
  amount: number
  date: string
  description: string
}

interface UseRewardsOptions {
  onRewardIssued?: (amount: number) => void
  onError?: (error: string) => void
}

export function useRewards(options: UseRewardsOptions = {}) {
  const { publicKey, sign, currentAccount } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [hasTrustline, setHasTrustline] = useState(false)
  const [slrBalance, setSlrBalance] = useState("0")
  const [xlmSpent, setXlmSpent] = useState(0)
  const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>([])
  const [error, setError] = useState<string | null>(null)

  // Check if user has SLR trustline and get balance
  const checkTrustlineAndBalance = useCallback(async () => {
    if (!publicKey) {
      setError("No wallet connected")
      return { hasTrustline: false, balance: "0" }
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const server = new Horizon.Server("https://horizon-testnet.stellar.org")
      const account = await server.loadAccount(publicKey)
      
      // Check if user has SLR trustline
      const slrTrustline = account.balances.find((balance: UserBalance) => 
        balance.asset_type !== 'native' && 
        balance.asset_code === SLR_ASSET_CODE && 
        balance.asset_issuer === SLR_ISSUER_WALLET
      )
      
      const trustlineExists = !!slrTrustline
      const balance = slrTrustline ? slrTrustline.balance : "0"
      
      setHasTrustline(trustlineExists)
      setSlrBalance(balance)
      
      return { hasTrustline: trustlineExists, balance }
    } catch (err) {
      console.error("Error checking trustline:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to check SLR trustline"
      setError(errorMessage)
      options.onError?.(errorMessage)
      
      return { hasTrustline: false, balance: "0" }
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, options])

  // Track XLM spent in a transaction
  const trackSpending = useCallback(async (txHash: string, xlmAmount: number, description: string = "Transaction") => {
    if (!publicKey) {
      setError("No wallet connected")
      return false
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Store the transaction for tracking
      const newTransaction: RewardTransaction = {
        id: `tx-${Date.now()}`,
        txHash,
        amount: xlmAmount,
        date: new Date().toISOString(),
        description
      }
      
      // Update local state
      setRewardTransactions(prev => [newTransaction, ...prev])
      setXlmSpent(prev => prev + xlmAmount)
      
      // In a real application, this transaction would be saved to a database
      // For this demo we just keep it in memory
      
      // Check if user has earned new rewards
      await checkEarnedRewards()
      
      return true
    } catch (err) {
      console.error("Error tracking spending:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to track spending"
      setError(errorMessage)
      options.onError?.(errorMessage)
      
      return false
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, options])

  // Check how many SLR tokens the user has earned and issue them if necessary
  const checkEarnedRewards = useCallback(async () => {
    if (!publicKey || !currentAccount) {
      setError("No wallet connected")
      return { earnedSLR: 0, issuedSLR: 0 }
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Calculate earned SLR based on XLM spent
      const earnedSLR = Math.floor(xlmSpent / SLR_REWARD_RATE)
      
      // Compare with current balance to see if we need to issue more
      const { hasTrustline, balance } = await checkTrustlineAndBalance()
      
      if (!hasTrustline) {
        // Can't issue rewards without a trustline
        return { earnedSLR, issuedSLR: 0 }
      }
      
      const currentBalance = parseFloat(balance)
      const slrToIssue = earnedSLR - currentBalance
      
      if (slrToIssue <= 0) {
        // No new SLR to issue
        return { earnedSLR, issuedSLR: 0 }
      }
      
      // In a real application, this would call the issuer service to issue the SLR
      // For demo purposes, we'll simulate a successful issuance
      toast.success(`You've earned ${slrToIssue} SLR tokens!`)
      
      // Update the balance to reflect the new tokens
      setSlrBalance((currentBalance + slrToIssue).toString())
      
      // Notify callback
      options.onRewardIssued?.(slrToIssue)
      
      return { earnedSLR, issuedSLR: slrToIssue }
    } catch (err) {
      console.error("Error checking earned rewards:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to check earned rewards"
      setError(errorMessage)
      options.onError?.(errorMessage)
      
      return { earnedSLR: 0, issuedSLR: 0 }
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, currentAccount, xlmSpent, checkTrustlineAndBalance, options])

  // Calculate earned SLR based on current XLM spent
  const calculateEarnedSLR = useCallback(() => {
    return Math.floor(xlmSpent / SLR_REWARD_RATE)
  }, [xlmSpent])

  // Load initial data when component mounts
  useEffect(() => {
    if (publicKey) {
      checkTrustlineAndBalance()
    }
  }, [publicKey, checkTrustlineAndBalance])

  return {
    isLoading,
    error,
    hasTrustline,
    slrBalance,
    xlmSpent,
    rewardTransactions,
    checkTrustlineAndBalance,
    trackSpending,
    checkEarnedRewards,
    calculateEarnedSLR
  }
} 