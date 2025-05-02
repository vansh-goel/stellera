"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Particles } from "@/app/components/particles"
import { Loader2, ArrowDownUp } from "lucide-react"
import { toast } from "sonner"
import { RecipientInput } from "@/app/components/recipient-input"
import { useWallet } from "@/app/providers/wallet-provider"
import { useUsername } from "@/app/hooks/use-username"
import { Horizon } from "@stellar/stellar-sdk"
import { createPaymentTransaction, submitTransaction } from "@/lib/stellar-transactions"
import { swapXlmForSlr, checkSlrTrustline, createSlrTrustlineTransaction, slrAsset } from "@/lib/slr-swap"
import * as Client from "@/packages/hello_world"

// SLR token issuer address
const SLR_ISSUER_WALLET = slrAsset.getIssuer()

// Network configuration
const horizonUrl = "https://horizon-testnet.stellar.org"
const sorobanRpcUrl = "https://soroban-testnet.stellar.org:443"

// Types
interface Asset {
  id: string
  name: string
  symbol: string
  balance: string
  icon?: string
  address?: string
}

type SwapHistory = {
  id: string
  fromAsset: string
  toAsset: string
  fromAmount: string
  toAmount: string
  date: string
  recipient: string
  recipientUsername?: string
  status: 'completed' | 'pending' | 'failed'
  txId?: string
}

export default function SwapPage() {
  const { wallet, isConnected, publicKey, getBalance, sign, currentAccount } = useWallet()
  const { username, loadUsername } = useUsername()
  
  // State for wallet connection
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  
  // Assets state 
  const [userAssets, setUserAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  
  // Swap history
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([])
  
  // Form state
  const [recipient, setRecipient] = useState("")
  const [resolvedRecipient, setResolvedRecipient] = useState("")
  const [fromAsset, setFromAsset] = useState<string>("native") // Default to XLM
  const [fromAmount, setFromAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [hasTrustline, setHasTrustline] = useState(false)
  
  // Fixed destination asset (SLR)
  const slrTokenAsset: Asset = {
    id: `SLR:${SLR_ISSUER_WALLET}`,
    name: "Stellera Token",
    symbol: "SLR",
    balance: "0",
    icon: "/assets/slr-icon.png",
    address: SLR_ISSUER_WALLET
  }
  
  // Load user data
  useEffect(() => {
    if (isConnected && publicKey) {
      loadUsername();
      fetchBalances();
      checkRecipientTrustline();
    }
  }, [isConnected, publicKey]);
  
  // Check if recipient has SLR trustline when recipient changes
  useEffect(() => {
    checkRecipientTrustline();
  }, [resolvedRecipient]);
  
  // Check if recipient has trustline for SLR
  const checkRecipientTrustline = async () => {
    if (!resolvedRecipient) return;
    
    try {
      const hasTrustline = await checkSlrTrustline(resolvedRecipient);
      setHasTrustline(hasTrustline);
    } catch (error) {
      console.error("Error checking trustline:", error);
      setHasTrustline(false);
    }
  };
  
  // Fetch user balances
  const fetchBalances = async () => {
    if (!publicKey) return;
    
    try {
      setIsLoadingAssets(true);
      const xlmBalance = await getBalance();
      
      // Fetch asset balances from Horizon
      const server = new Horizon.Server(horizonUrl);
      const account = await server.loadAccount(publicKey);
      
      const updatedAssets: Asset[] = [
        { 
          id: "native", 
          name: "Stellar Lumens", 
          symbol: "XLM", 
          balance: xlmBalance,
          icon: "/xlm-icon.png"
        },
      ];
      
      // Add other assets from account including SLR if it exists
      let slrFound = false;
      
      account.balances.forEach((balance: any) => {
        if (balance.asset_type !== 'native') {
          const assetCode = balance.asset_code;
          const assetIssuer = balance.asset_issuer;
          
          // Check if this is our SLR token
          if (assetCode === "SLR" && assetIssuer === SLR_ISSUER_WALLET) {
            slrFound = true;
            updatedAssets.push({
              id: `SLR:${SLR_ISSUER_WALLET}`,
              name: "Stellera Token",
              symbol: "SLR",
              balance: balance.balance,
              icon: "/assets/slr-icon.png",
              address: SLR_ISSUER_WALLET
            });
          } else {
            updatedAssets.push({
              id: `${assetCode}:${assetIssuer}`,
              name: assetCode,
              symbol: assetCode,
              balance: balance.balance,
              icon: `/assets/${assetCode.toLowerCase()}-icon.png`,
              address: assetIssuer
            });
          }
        }
      });
      
      // Add SLR with zero balance if not found
      if (!slrFound) {
        updatedAssets.push({
          ...slrTokenAsset,
          balance: "0"
        });
      }
      
      setUserAssets(updatedAssets);
    } catch (error) {
      console.log("Error fetching balances:", error);
      toast.error("Failed to load balances");
    } finally {
      setIsLoadingAssets(false);
    }
  };
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers with up to 7 decimal places
    if (/^\d*\.?\d{0,7}$/.test(value) || value === "") {
      setFromAmount(value);
    }
  }
  
  // Calculate estimated SLR amount based on XLM input
  const calculateSLRAmount = (amount: string): string => {
    if (!amount || isNaN(parseFloat(amount))) return "0";
    // Conversion rate: 1 XLM = 0.5 SLR
    return (parseFloat(amount) * 0.5).toFixed(6);
  }
  
  // Calculate min amount based on slippage
  const calculateMinAmount = (amount: string, slippagePercent: string): string => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return "0";
    const slippageValue = parseFloat(slippagePercent) / 100;
    return (value * (1 - slippageValue)).toFixed(6);
  }
  
  // Get selected from asset
  const getSelectedFromAsset = (): Asset | undefined => {
    return userAssets.find(a => a.id === fromAsset);
  }
  
  // Get max available balance
  const getMaxBalance = (): string => {
    const asset = getSelectedFromAsset();
    return asset ? asset.balance : "0";
  }
  
  // Set max amount
  const setMaxAmount = () => {
    setFromAmount(getMaxBalance());
  }
  
  // Create trustline for recipient if needed
  const createTrustline = async () => {
    if (!publicKey || !resolvedRecipient || !isConnected) {
      toast.error("Please connect your wallet and enter a recipient");
      return false;
    }
    
    try {
      setIsSubmitting(true);
      setTxStatus('pending');
      setStatusMessage('Creating trustline for SLR token...');
      
      // Get transaction for creating trustline
      const { transaction, network_passphrase } = await createSlrTrustlineTransaction(resolvedRecipient);
      
      // Sign the transaction (this requires the recipient's signature)
      setStatusMessage('Please sign the transaction in your wallet to create trustline...');
      const signedTransaction = await sign({
        transactionXDR: transaction,
        network: network_passphrase,
      } as any);
      
      // Submit transaction to network
      setStatusMessage('Submitting trustline transaction to the network...');
      await submitTransaction(signedTransaction);
      
      setHasTrustline(true);
      setStatusMessage('Trustline created successfully!');
      toast.success('Trustline created successfully!');
      
      return true;
    } catch (error: any) {
      console.error("Error creating trustline:", error);
      setTxStatus('error');
      setStatusMessage(`Failed to create trustline: ${error.message || "Unknown error"}`);
      toast.error(`Failed to create trustline: ${error.message || "Unknown error"}`);
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Handle swap submission
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !publicKey || !currentAccount) {
      toast.error("Please connect your wallet");
      return;
    }
    
    if (!recipient) {
      toast.error("Please enter a recipient");
      return;
    }
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const selectedAsset = getSelectedFromAsset();
    if (!selectedAsset) {
      toast.error("Please select an asset");
      return;
    }
    
    // Check for sufficient balance
    if (parseFloat(fromAmount) > parseFloat(getMaxBalance())) {
      toast.error("Insufficient balance");
      return;
    }
    
    // Only XLM is supported for swap to SLR currently
    if (selectedAsset.id !== "native") {
      toast.error("Only XLM can be swapped for SLR tokens");
      return;
    }
    
    // Use resolved recipient if it's a username, otherwise use the direct input
    const actualRecipient = resolvedRecipient || recipient;
    
    try {
      setIsSubmitting(true);
      setTxStatus('pending');
      setStatusMessage('Preparing transaction...');
      
      // Check if recipient account exists
      let createAccount = false;
      try {
        const server = new Horizon.Server(horizonUrl);
        await server.loadAccount(actualRecipient);
      } catch (error: any) {
        if (error.status === 404) {
          createAccount = true;
          if (parseFloat(fromAmount) < 1) {
            toast.error("New accounts require at least 1 XLM");
            setTxStatus('error');
            setStatusMessage("New accounts require at least 1 XLM");
            setIsSubmitting(false);
            return;
          }
          toast.info("Destination account does not exist. This will create a new account.");
        } else {
          throw error;
        }
      }
      
      // Step 1: Send XLM to the swap function
      setStatusMessage('Creating payment transaction to issuer...');
      
      // Create payment transaction to send XLM from user to SLR_ISSUER_WALLET
      // IMPORTANT: In a real implementation, first check if the recipient has a trustline for SLR,
      // and if not, ask them to create one. This implementation assumes they have one already.
      
      // Calculate estimated SLR amount
      const estimatedSlrAmount = calculateSLRAmount(fromAmount);
      
      // First check if user has trustline for SLR
      if (!hasTrustline) {
        setStatusMessage('Recipient needs to establish a trustline for SLR tokens...');
        
        // Note: In a real implementation, you would have a way for the recipient to 
        // create a trustline. For now, we'll just inform the user.
        toast.error("Recipient needs to establish a trustline for SLR tokens");
        setTxStatus('error');
        setIsSubmitting(false);
        return;
      }
      
      // Create payment transaction to send XLM to issuer wallet
      setStatusMessage('Creating transaction to send XLM...');
      const { transaction, network_passphrase } = await createPaymentTransaction({
        source: publicKey,
        destination: SLR_ISSUER_WALLET, // Send to SLR issuer wallet
        amount: fromAmount,
        asset: "native", // XLM
        memo: `For:${actualRecipient.substring(0, 20)}` // Shortened memo with recipient reference
      });
      
      // Sign the transaction
      setStatusMessage('Please sign the transaction in your wallet...');
      const signedTransaction = await sign({
        transactionXDR: transaction,
        network: network_passphrase,
      } as any);
      
      // Submit transaction to network
      setStatusMessage('Submitting XLM payment to the network...');
      const xlmPaymentResult = await submitTransaction(signedTransaction);
      
      // Step 2: Issue SLR tokens to the recipient
      setStatusMessage('Processing SLR token swap...');
      const swapResult = await swapXlmForSlr(
        fromAmount, 
        actualRecipient, 
        `From:${publicKey.substring(0, 20)}` // Shortened memo
      );
      
      if (swapResult.success) {
        // Record the transaction in history
        const recipientUsername = recipient.startsWith('@') ? recipient.substring(1) : undefined;
        
        const newSwap: SwapHistory = {
          id: `swap-${Date.now()}`,
          fromAsset: "XLM",
          toAsset: "SLR",
          fromAmount,
          toAmount: swapResult.slrAmount,
          date: new Date().toISOString(),
          recipient: actualRecipient,
          recipientUsername,
          status: 'completed',
          txId: swapResult.txHash
        };
        
        setSwapHistory([newSwap, ...swapHistory]);
        setTxStatus('success');
        setStatusMessage(`Successfully swapped ${fromAmount} XLM for ${swapResult.slrAmount} SLR`);
        toast.success(`Successfully swapped ${fromAmount} XLM for ${swapResult.slrAmount} SLR`);
        
        // Reset form
        setFromAmount("");
        
        // Refresh balances
        setTimeout(fetchBalances, 3000);
      } else {
        throw new Error(swapResult.error || "Swap failed");
      }
    } catch (error: any) {
      console.log("Swap error:", error);
      setTxStatus('error');
      setStatusMessage(`Swap failed: ${error.message || "Unknown error"}`);
      toast.error(`Swap failed: ${error.message || "Unknown error"}`);
      
      // Add failed transaction to history if appropriate
      if (fromAmount && getSelectedFromAsset()) {
        const recipientUsername = recipient.startsWith('@') ? recipient.substring(1) : undefined;
        const failedSwap: SwapHistory = {
          id: `swap-failed-${Date.now()}`,
          fromAsset: getSelectedFromAsset()!.symbol,
          toAsset: "SLR",
          fromAmount,
          toAmount: calculateSLRAmount(fromAmount),
          date: new Date().toISOString(),
          recipient: resolvedRecipient || recipient,
          recipientUsername,
          status: 'failed'
        };
        setSwapHistory([failedSwap, ...swapHistory]);
      }
    }
    
    setIsSubmitting(false);
  };
  
  // Calculate estimated SLR amount from the current input
  const estimatedSlrAmount = calculateSLRAmount(fromAmount);
  
  return (
    <div className="container mx-auto space-y-8 py-8">
      <Particles />
      <h1 className="text-3xl font-bold tracking-tight">Swap XLM for SLR</h1>
      
      {/* Status Messages */}
      {statusMessage && (
        <div className={`p-3 rounded-md ${
          txStatus === 'error' ? 'bg-red-500/20 text-red-200' : 
          txStatus === 'success' ? 'bg-green-500/20 text-green-200' :
          txStatus === 'pending' ? 'bg-amber-500/20 text-amber-200' :
          'bg-blue-500/20 text-blue-200'
        }`}>
          {statusMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Swap XLM for SLR Tokens</CardTitle>
              <CardDescription>
                Send XLM and the recipient will receive SLR tokens
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSwap}>
              <CardContent className="space-y-6">
                {/* Recipient */}
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <RecipientInput
                    value={recipient}
                    onChange={(value, resolvedAddress) => {
                      setRecipient(value);
                      setResolvedRecipient(resolvedAddress || "");
                    }}
                    placeholder="Enter public key or username"
                  />
                  {resolvedRecipient && !hasTrustline && (
                    <div className="mt-2 text-sm text-amber-500">
                      Warning: Recipient doesn't have a trustline for SLR tokens.
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="ml-2" 
                        onClick={createTrustline}
                        disabled={isSubmitting}
                      >
                        Create Trustline
                      </Button>
                    </div>
                  )}
                </div>
              
                {/* From Asset */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm font-medium">From</Label>
                    <button 
                      type="button" 
                      className="text-xs text-primary"
                      onClick={setMaxAmount}
                    >
                      Max: {isLoadingAssets ? "Loading..." : getMaxBalance()}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fromAmount}
                      onChange={handleAmountChange}
                      className="w-full bg-transparent text-2xl font-medium focus:outline-none"
                      placeholder="0.00"
                      required
                    />
                    
                    <Select
                      value={fromAsset}
                      onValueChange={setFromAsset}
                    >
                      <SelectTrigger className="min-w-[140px]">
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Only show XLM for now as we only support XLM to SLR swap */}
                        {userAssets
                          .filter(asset => asset.id === "native")
                          .map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              <div className="flex items-center gap-2">
                                <span>{asset.symbol}</span>
                                <span className="text-muted-foreground text-xs">
                                  {parseFloat(asset.balance).toFixed(4)}
                                </span>
                              </div>
                            </SelectItem>
                        ))}
                        {isLoadingAssets && (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    {getSelectedFromAsset()?.name || "Select an asset"} - Available: {getMaxBalance()}
                  </div>
                </div>
                
                {/* Arrow Down */}
                <div className="flex justify-center my-2">
                  <div className="bg-muted rounded-full p-2">
                    <ArrowDownUp className="h-4 w-4" />
                  </div>
                </div>
                
                {/* To Asset (SLR) */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm font-medium">To (SLR)</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={estimatedSlrAmount}
                      readOnly
                      className="w-full bg-transparent text-2xl font-medium focus:outline-none"
                      placeholder="0.00"
                    />
                    
                    <div className="min-w-[140px] flex items-center gap-2 justify-center border rounded-md px-3">
                      <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">S</div>
                      <span>SLR</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Stellera Token - SLR
                  </div>
                </div>
                
                {/* Price Info & Slippage */}
                <div className="bg-muted/20 rounded-md p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium">
                      1 XLM = 0.5 SLR
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted-foreground">Slippage Tolerance</span>
                    <div className="flex gap-1">
                      {['0.5', '1', '2', '3'].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSlippage(value)}
                          className={`px-2 py-1 rounded-md text-xs ${slippage === value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted-foreground">Minimum Received</span>
                    <span className="font-medium">
                      {calculateMinAmount(estimatedSlrAmount, slippage)} SLR
                    </span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    !isConnected || 
                    !recipient || 
                    !fromAmount || 
                    parseFloat(fromAmount) <= 0 || 
                    parseFloat(fromAmount) > parseFloat(getMaxBalance()) || 
                    isSubmitting
                  }
                >
                  {!isConnected 
                    ? 'Connect Wallet' 
                    : !recipient
                      ? 'Enter Recipient'
                      : !fromAmount 
                        ? 'Enter Amount' 
                        : parseFloat(fromAmount) > parseFloat(getMaxBalance())
                          ? 'Insufficient Balance'
                          : !hasTrustline
                            ? 'Recipient Needs SLR Trustline'
                            : isSubmitting
                              ? 'Processing...'
                              : 'Swap XLM for SLR'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        
        {/* Swap History & Assets */}
        <div className="col-span-1 space-y-6">
          {/* Swap History */}
          <Card>
            <CardHeader>
              <CardTitle>Swap History</CardTitle>
              <CardDescription>Your recent token swaps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {swapHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No swap history</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3">
                    {swapHistory.map((swap) => (
                      <div key={swap.id} className="p-3 rounded-md border text-sm">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">
                            {swap.fromAmount} {swap.fromAsset} → {swap.toAmount} {swap.toAsset}
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full ${
                            swap.status === 'completed' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                              : swap.status === 'pending' 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {swap.status}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          To: {swap.recipientUsername ? `@${swap.recipientUsername}` : `${swap.recipient.substring(0, 8)}...${swap.recipient.substring(swap.recipient.length - 8)}`}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{new Date(swap.date).toLocaleString()}</span>
                          {swap.txId && (
                            <a 
                              href={`https://testnet.stellarchain.io/tx/${swap.txId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Transaction
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Available Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Available Assets</CardTitle>
              <CardDescription>Assets in your wallet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoadingAssets ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : userAssets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets found in wallet</p>
                ) : (
                  userAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {asset.symbol === "SLR" ? (
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">S</div>
                          ) : (
                            <span className="text-xs font-bold">{asset.symbol}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{parseFloat(asset.balance).toFixed(7)}</div>
                        <div className="text-xs text-muted-foreground">Available</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}