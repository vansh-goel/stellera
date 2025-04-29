"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/app/components/ui/button"
import { useWallet } from "@/app/providers/wallet-provider"
import { toast } from "sonner"
import { WalletSwitcher } from "@/app/components/wallet-switcher"
import { RecentTransactions } from "@/app/components/recent-transactions"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { RecipientInput } from "@/app/components/recipient-input"
import { useUsername } from "@/app/hooks/use-username"
import { 
  createPaymentTransaction, 
  submitTransaction, 
  createChangeTrustTransaction
} from "@/lib/stellar-transactions"
import { 
  Dialog,
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/app/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import StellarSdk, { Horizon } from "@stellar/stellar-sdk"
import { Loader2 } from "lucide-react"

// Network configuration
const horizonUrl = "https://horizon-testnet.stellar.org";

type Balance = {
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  balance: string
}

type PendingCallback = (pincode: string) => Promise<void>;

export function Dashboard() {
  const { wallet, isConnected, publicKey, fundTestnetAccount, getBalance, isTestnet, currentAccount, sign } = useWallet()
  const [balance, setBalance] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(true)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [resolvedRecipient, setResolvedRecipient] = useState("") // Store resolved public key
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [selectedAsset, setSelectedAsset] = useState("native") // Default to XLM
  
  // Trustline modal state
  const [showTrustlineModal, setShowTrustlineModal] = useState(false)
  const [assetCode, setAssetCode] = useState("")
  const [assetIssuer, setAssetIssuer] = useState("")
  
  // Transaction confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationTitle, setConfirmationTitle] = useState("")
  const [confirmationDescription, setConfirmationDescription] = useState("")
  const [txXDR, setTxXDR] = useState("")
  const [networkPassphrase, setNetworkPassphrase] = useState("")
  const [isProcessingTx, setIsProcessingTx] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => Promise<void>) | null>(null)
  
  // Account balances
  const [balances, setBalances] = useState<Balance[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isSendingPayment, setIsSendingPayment] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallet || !isConnected || !publicKey) return

      try {
        setIsLoading(true)
        const newBalance = await getBalance()
        setBalance(newBalance)
      } catch (error) {
        console.error("Failed to fetch balance:", error)
        toast.error("Failed to fetch account balance")
      } finally {
        setIsLoading(false)
      }
    }

    if (publicKey) {
      fetchBalance()
    }
  }, [wallet, isConnected, publicKey, getBalance])

  // Polling effect for transactions
  useEffect(() => {
    if (!publicKey) return; // Don't poll if no public key

    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId); // Clear interval on component unmount or publicKey change
  }, [publicKey]);

  const handleFundAccount = async () => {
    try {
      await fundTestnetAccount()
      toast.success("Account funded successfully!")
      // Refresh balance after funding
      const newBalance = await getBalance()
      setBalance(newBalance)
      setRefreshTrigger(prev => prev + 1); // Trigger transaction refresh
    } catch (error) {
      console.error("Failed to fund account:", error)
      toast.error("Failed to fund account")
    }
  }
  
  // Prepare a payment transaction
  const handleSendPayment = async () => {
    if (!recipient || !amount || !publicKey || !currentAccount) {
      toast.error("Please enter recipient and amount")
      return
    }

    try {
      setIsSendingPayment(true);
      const amountNum = parseFloat(amount)
      
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error("Please enter a valid amount")
        return
      }
      
      // Use resolved address if it exists, otherwise use the recipient input
      const actualRecipient = resolvedRecipient || recipient
      
      // Check if destination account exists
      let createAccount = false;
      try {
        const server = new Horizon.Server(horizonUrl);
        await server.loadAccount(actualRecipient);
      } catch (error: any) {
        if (error.status === 404) {
          createAccount = true;
          if (selectedAsset !== "native") {
            toast.error("New accounts can only be created with XLM")
            return
          }
          if (amountNum < 1) {
            toast.error("New accounts require at least 1 XLM")
            return
          }
          toast.info("Destination account does not exist. This will create a new account.")
        } else {
          throw error;
        }
      }
      
      // Create payment transaction
      const { transaction, network_passphrase } = await createPaymentTransaction({
        source: publicKey,
        destination: actualRecipient,
        amount,
        asset: selectedAsset,
        memo
      })
      
      // Directly process the transaction
      await processTransaction(transaction, network_passphrase)
      setShowPaymentModal(false)
      resetPaymentForm()
    } catch (error: any) {
      console.error("Failed to create transaction:", error)
      toast.error(`Failed to create transaction: ${error.message || "Unknown error"}`)
    } finally {
      setIsSendingPayment(false);
    }
  }
  
  // Prepare a trustline transaction
  const handleAddTrustline = async () => {
    if (!assetCode || !assetIssuer || !publicKey || !currentAccount) {
      toast.error("Please enter asset code and issuer")
      return
    }

    try {
      const asset = `${assetCode}:${assetIssuer}`
      
      // Create trustline transaction
      const { transaction, network_passphrase } = await createChangeTrustTransaction({
        source: publicKey,
        asset
      })
      
      // Directly process the transaction
      await processTransaction(transaction, network_passphrase)
      setShowTrustlineModal(false)
      resetTrustlineForm()
    } catch (error: any) {
      console.error("Failed to create trustline transaction:", error)
      toast.error(`Failed to create trustline transaction: ${error.message || "Unknown error"}`)
    }
  }
  
  // Remove a trustline
  const handleRemoveTrustline = async (assetCode: string, assetIssuer: string) => {
    if (!publicKey || !currentAccount) {
      toast.error("Wallet not connected")
      return
    }

    try {
      const asset = `${assetCode}:${assetIssuer}`
      
      // Create trustline removal transaction (limit = 0)
      const { transaction, network_passphrase } = await createChangeTrustTransaction({
        source: publicKey,
        asset,
        limit: "0"
      })
      
      // Directly process the transaction
      await processTransaction(transaction, network_passphrase)
    } catch (error: any) {
      console.error("Failed to remove trustline:", error)
      toast.error(`Failed to remove trustline: ${error.message || "Unknown error"}`)
    }
  }
  
  // Process a transaction (accepts XDR and passphrase)
  const processTransaction = async (transactionXDR: string, networkPassphrase: string) => {
    if (!sign || !currentAccount) {
      toast.error("Wallet not initialized")
      return
    }
    
    try {
      setIsProcessingTx(true)
      
      // Sign transaction with wallet
      const signedTransaction = await sign({
        transactionXDR: transactionXDR,
        network: networkPassphrase,
      } as any)
      
      // Submit transaction to network
      const result = await submitTransaction(signedTransaction)
      
      toast.success("Transaction completed successfully!")
      setShowConfirmation(false)
      
      // Refresh balances and transactions
      const newBalance = await getBalance()
      setBalance(newBalance)
      setRefreshTrigger(prev => prev + 1); // Trigger transaction refresh
    } catch (error: any) {
      console.error("Transaction failed:", error)
      toast.error(`Transaction failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsProcessingTx(false)
    }
  }
  
  // Reset payment form
  const resetPaymentForm = () => {
    setRecipient("")
    setResolvedRecipient("")
    setAmount("")
    setMemo("")
    setSelectedAsset("native")
  }
  
  // Reset trustline form
  const resetTrustlineForm = () => {
    setAssetCode("")
    setAssetIssuer("")
  }
  
  // Format asset name for display
  const formatAssetName = (balance: Balance) => {
    if (balance.asset_type === 'native') return 'XLM (native)'
    return <span className="break-words">{`${balance.asset_code} (${balance.asset_issuer?.substring(0, 4)}...${balance.asset_issuer?.slice(-4)})`}</span>
  }

  return (
    <div className="py-8 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute -right-20 top-10 w-80 h-80 rounded-full bg-primary/10 blur-[100px] opacity-40 z-0"></div>
          <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px] opacity-40 z-0"></div>
          
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 gradient-text">
              Welcome to <span className="font-bold italic">Stellera</span> 
            </h1>
            
            <div className="flex items-center gap-4 mb-10">
              <WalletSwitcher />
              {isTestnet && (
                <Button variant="outline" size="sm" onClick={handleFundAccount}>
                  Fund Testnet Account
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-5">
              <Button 
                variant="cosmic" 
                size="lg" 
                className="rounded-xl"
                onClick={() => setShowPaymentModal(true)}
                disabled={!isConnected}
              >
                Send Payment
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-xl"
                onClick={() => setShowTrustlineModal(true)}
                disabled={!isConnected}
              >
                Manage Assets
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Balance Overview */}
      <section className="py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Your Balance</h2>
          <div className="text-3xl font-bold">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `${balance} XLM`}
          </div>
        </div>
        
        {balances.length > 0 && (
          <div className="bg-white/10 rounded-xl border overflow-hidden mt-4">
            <div className="p-4 border-b bg-muted/50">
              <div className="grid grid-cols-12 font-medium">
                <div className="col-span-4">Asset</div>
                <div className="col-span-6">Balance</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
            </div>
            <div className="divide-y">
              {balances.map((asset, index) => (
                <div key={index} className="p-4 grid grid-cols-12 items-center">
                  <div className="col-span-4 font-medium">
                    {formatAssetName(asset)}
                  </div>
                  <div className="col-span-6">
                    {asset.balance}
                  </div>
                  <div className="col-span-2 text-right">
                    {asset.asset_type !== 'native' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveTrustline(asset.asset_code!, asset.asset_issuer!)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recent Transactions */}
      <section className="">
        <h2 className="text-2xl font-semibold mb-8">Recent Transactions</h2>
        <RecentTransactions refreshTrigger={refreshTrigger} />
      </section>
      
      {/* Send Payment Dialog */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>Send Payment</DialogTitle>
            <DialogDescription id="send-payment-description">
              Send XLM or other assets to another Stellar account or @username.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4" aria-describedby="send-payment-description">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <RecipientInput
                value={recipient}
                onChange={(value, resolvedAddress) => {
                  setRecipient(value);
                  setResolvedRecipient(resolvedAddress || "");
                }}
                placeholder="Enter public key or @username"
              />
              {resolvedRecipient && recipient.startsWith('@') && (
                <p className="text-xs text-muted-foreground">
                  Username will be resolved to: {resolvedRecipient}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.0000001"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select
                  value={selectedAsset}
                  onValueChange={setSelectedAsset}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="native">XLM (native)</SelectItem>
                    {balances
                      .filter(asset => asset.asset_type !== 'native')
                      .map((asset, index) => (
                        <SelectItem 
                          key={index} 
                          value={`${asset.asset_code}:${asset.asset_issuer}`}
                        >
                          {asset.asset_code}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memo">Memo (Optional)</Label>
              <Input
                id="memo"
                placeholder="Add a message"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Memos can be used to provide additional information about a transaction.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendPayment}
              disabled={!recipient || !amount || parseFloat(amount) <= 0 || isSendingPayment}
              className="w-full sm:w-auto"
            >
              {isSendingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Trustline Dialog */}
      <Dialog open={showTrustlineModal} onOpenChange={setShowTrustlineModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>Manage Assets</DialogTitle>
            <DialogDescription id="manage-assets-description">
              Create a trustline to hold and trade assets other than XLM.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4" aria-describedby="manage-assets-description">
            <div className="space-y-2">
              <Label htmlFor="assetCode">Asset Code</Label>
              <Input
                id="assetCode"
                placeholder="e.g., USDC, EURX"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assetIssuer">Asset Issuer</Label>
              <Input
                id="assetIssuer"
                placeholder="G..."
                value={assetIssuer}
                onChange={(e) => setAssetIssuer(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground break-words">
                This is the public key of the account that issued the asset.
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-md text-sm">
              <p>
                <strong>Note:</strong> Each trustline increases your minimum XLM balance by 0.5 XLM.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowTrustlineModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTrustline}
              disabled={!assetCode || !assetIssuer}
              className="w-full sm:w-auto"
            >
              Add Trustline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}