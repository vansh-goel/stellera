"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Wallet, StellarConfiguration, ApplicationConfiguration, DefaultSigner } from '@stellar/typescript-wallet-sdk'
import axios, { AxiosInstance } from 'axios'
import { useToast } from "@/app/hooks/use-toast"

// Import Keypair for the importWallet function
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk'

interface WalletAccount {
  publicKey: string
  secretKey: string
  name: string
}

interface WalletContextType {
  wallet: Wallet | null
  isConnected: boolean
  connect: (account?: WalletAccount) => Promise<void>
  disconnect: () => void
  isLoading: boolean
  error: string | null
  publicKey: string | null
  createAccount: () => Promise<void>
  fundTestnetAccount: () => Promise<void>
  getBalance: () => Promise<string>
  isTestnet: boolean
  accounts: WalletAccount[]
  addAccount: (account: WalletAccount) => void
  removeAccount: (publicKey: string) => void
  switchAccount: (publicKey: string) => Promise<void>
  importWallet: (secretKey: string, name: string) => Promise<void>
  hasDefaultWallet: boolean
  currentAccount: WalletAccount | null
  sign: (params: { transactionXDR: string, network: string, pincode: string }) => Promise<string>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [isTestnet, setIsTestnet] = useState(true)
  const [hasDefaultWallet, setHasDefaultWallet] = useState(false)
  const [currentAccount, setCurrentAccount] = useState<WalletAccount | null>(null)
  const { toast } = useToast()

  const getLastUsedAccount = () => {
    const lastUsedPublicKey = localStorage.getItem("stellera_last_used_account")
    if (!lastUsedPublicKey) return null
    
    const savedAccounts = localStorage.getItem("stellera_accounts")
    if (!savedAccounts) return null
    
    const parsedAccounts = JSON.parse(savedAccounts)
    return parsedAccounts.find((a: WalletAccount) => a.publicKey === lastUsedPublicKey) || null
  }

  const setLastUsedAccount = (publicKey: string) => {
    localStorage.setItem("stellera_last_used_account", publicKey)
  }

  const loadSavedAccounts = () => {
    const savedAccounts = localStorage.getItem("stellera_accounts")
    if (savedAccounts) {
      const parsedAccounts = JSON.parse(savedAccounts)
      setAccounts(parsedAccounts)
      return parsedAccounts
    }
    return []
  }

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Configure axios client
        const customClient: AxiosInstance = axios.create({
          timeout: 10000,
        })

        // Create application configuration
        const appConfig = new ApplicationConfiguration(DefaultSigner, customClient)
        
        // Initialize wallet with Testnet configuration
        const newWallet = new Wallet({
          stellarConfiguration: StellarConfiguration.TestNet(),
          applicationConfiguration: appConfig,
        })
        
        setWallet(newWallet)

        // Load saved accounts
        const savedAccounts = loadSavedAccounts()
        
        if (savedAccounts.length > 0) {
          // Try to get the last used account
          const lastUsedAccount = getLastUsedAccount()
          
          if (lastUsedAccount) {
            // Set the current account and connection state immediately
            setCurrentAccount(lastUsedAccount)
            setPublicKey(lastUsedAccount.publicKey)
            setIsConnected(true)
            setHasDefaultWallet(true)
            return
          }
          
          // If no last used account, use the first account
          const firstAccount = savedAccounts[0]
          setCurrentAccount(firstAccount)
          setPublicKey(firstAccount.publicKey)
          setIsConnected(true)
          setHasDefaultWallet(true)
          return
        }
        
        // If we get here, there are no accounts
        setHasDefaultWallet(false)
        setIsConnected(false)
        setCurrentAccount(null)
        setPublicKey(null)
      } catch (err) {
        console.log("Failed to initialize wallet:", err)
        setError(err instanceof Error ? err.message : "Failed to initialize wallet")
        setHasDefaultWallet(false)
        setIsConnected(false)
        setCurrentAccount(null)
        setPublicKey(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeWallet()
  }, [])

  const addAccount = (account: WalletAccount) => {
    const newAccounts = [...accounts, account]
    setAccounts(newAccounts)
    localStorage.setItem("stellera_accounts", JSON.stringify(newAccounts))
    setHasDefaultWallet(true)
  }

  const removeAccount = (publicKey: string) => {
    const newAccounts = accounts.filter(acc => acc.publicKey !== publicKey)
    setAccounts(newAccounts)
    localStorage.setItem("stellera_accounts", JSON.stringify(newAccounts))
    
    if (currentAccount?.publicKey === publicKey) {
      disconnect()
    }
  }

  const switchAccount = async (publicKey: string) => {
    const account = accounts.find(acc => acc.publicKey === publicKey)
    if (account) {
      console.log("Switching to account:", account)
      await connect(account)
    }
  }

  const createAccount = async () => {
    if (!wallet) {
      setError("Wallet not initialized")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const account = wallet.stellar().account()
      const keypair = account.createKeypair()
      
      const newAccount = {
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey,
        name: `Account ${accounts.length + 1}`
      }
      
      addAccount(newAccount)
      await connect(newAccount)
    } catch (err) {
      console.log("Failed to create account:", err)
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const fundTestnetAccount = async () => {
    if (!wallet || !publicKey || !isTestnet) {
      toast({
        title: "Error",
        description: "Wallet not initialized, no public key, or not on testnet",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      await wallet.stellar().fundTestnetAccount(publicKey)
      toast({
        title: "Success",
        description: "Account funded successfully",
      })
    } catch (err) {
      console.log("Failed to fund account:", err)
      toast({
        title: "Error",
        description: "Failed to fund account. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getBalance = async () => {
    if (!wallet || !publicKey) {
      setError("Wallet not initialized or no public key")
      return "0"
    }

    try {
      const account = await wallet.stellar().server.loadAccount(publicKey)
      const xlmBalance = account.balances.find((b: { asset_type: string }) => b.asset_type === "native")
      return xlmBalance ? xlmBalance.balance : "0"
    } catch (err) {
      console.log("Failed to get balance:", err)
      setError(err instanceof Error ? err.message : "Failed to get balance")
      return "0"
    }
  }

  const connect = async (account?: WalletAccount) => {
    if (!wallet) {
      setError("Wallet not initialized")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      if (account) {
        setPublicKey(account.publicKey)
        setIsConnected(true)
        setCurrentAccount(account)
        setLastUsedAccount(account.publicKey)
        setHasDefaultWallet(true)
      } else {
        throw new Error("No account provided")
      }
    } catch (err) {
      console.log("Failed to connect wallet:", err)
      setError(err instanceof Error ? err.message : "Failed to connect wallet")
      setIsConnected(false)
      setHasDefaultWallet(false)
      setCurrentAccount(null)
      setPublicKey(null)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setPublicKey(null)
    setCurrentAccount(null)
    setError(null)
    // Don't remove the last used account from localStorage
    // This way we can reconnect to it next time
  }

  const importWallet = async (secretKey: string, name: string) => {
    if (!wallet) {
      setError("Wallet not initialized")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const keypair = Keypair.fromSecret(secretKey)
      
      const newAccount = {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        name: name
      }
      
      addAccount(newAccount)
      await connect(newAccount)
    } catch (err) {
      console.log("Failed to import wallet:", err)
      setError(err instanceof Error ? err.message : "Failed to import wallet")
    } finally {
      setIsLoading(false)
    }
  }

  // Add sign function to sign transactions with the current account
  const sign = async ({ transactionXDR, network, pincode }: { transactionXDR: string, network: string, pincode: string }) => {
    if (!wallet || !currentAccount) {
      throw new Error("Wallet not initialized or no account selected");
    }

    try {
      // Verify pincode here if needed
      // In a real app, the pincode would be used for secure key access
      
      // Import the functions we need from stellar-sdk
      
      // Use the current account's secret key
      const keypair = Keypair.fromSecret(currentAccount.secretKey);
      
      // Create a transaction object from XDR
      const transaction = TransactionBuilder.fromXDR(transactionXDR, network);
      
      // Sign the transaction
      transaction.sign(keypair);
      
      // Return the signed transaction XDR
      return transaction.toXDR();
    } catch (err) {
      console.log("Failed to sign transaction:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to sign transaction");
    }
  };

  const value = {
    wallet,
    isConnected,
    connect,
    disconnect,
    isLoading,
    error,
    publicKey,
    createAccount,
    fundTestnetAccount,
    getBalance,
    isTestnet,
    accounts,
    addAccount,
    removeAccount,
    switchAccount,
    importWallet,
    hasDefaultWallet,
    currentAccount,
    sign
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}