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
import * as Client from "@/packages/hello_world"

// USDC contract address on Stellar
const USDC_CONTRACT_ADDRESS = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

// XLM contract address on Stellar (needed for smart contract swap)
const XLM_CONTRACT_ADDRESS = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

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
  address?: string // Soroban token contract address
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
  
  // Client instance for smart contract
  const [contractClient, setContractClient] = useState<Client.Client | null>(null)
  
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
  
  // Fixed destination asset (USDC)
  const usdcAsset: Asset = {
    id: `USDC:${USDC_CONTRACT_ADDRESS}`,
    name: "USD Coin",
    symbol: "USDC",
    balance: "0",
    icon: "/assets/usdc-icon.png",
    address: USDC_CONTRACT_ADDRESS
  }
  
  // Initialize contract client
  useEffect(() => {
    const client = new Client.Client({
      ...Client.networks.testnet,
      rpcUrl: sorobanRpcUrl
    });
    setContractClient(client);
  }, []);
  
  // Load user data
  useEffect(() => {
    if (isConnected && publicKey) {
      loadUsername();
      fetchBalances();
    }
  }, [isConnected, publicKey]);
  
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
          icon: "/xlm-icon.png",
          address: XLM_CONTRACT_ADDRESS
        },
      ];
      
      // Add other assets from account
      account.balances.forEach((balance: any) => {
        if (balance.asset_type !== 'native') {
          const assetCode = balance.asset_code;
          updatedAssets.push({
            id: `${assetCode}:${balance.asset_issuer}`,
            name: assetCode,
            symbol: assetCode,
            balance: balance.balance,
            icon: `/assets/${assetCode.toLowerCase()}-icon.png`,
            address: balance.asset_issuer
          });
        }
      });
      
      // Add USDC if not already in the list
      if (!updatedAssets.some(asset => asset.id === usdcAsset.id)) {
        updatedAssets.push(usdcAsset);
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
  
  // Calculate estimated USDC amount (in a real app, this would use an oracle or exchange rate API)
  const calculateUSDCAmount = (amount: string): string => {
    if (!amount || isNaN(parseFloat(amount))) return "0";
    // Simple conversion example - in a real app this would use market rates
    // Assuming 1 XLM = 0.12 USDC for this example
    return (parseFloat(amount) * 0.12).toFixed(6);
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
  
  // Handle swap using smart contract
  const handleSmartContractSwap = async () => {
    if (!contractClient || !publicKey) {
      toast.error("Smart contract client not initialized or wallet not connected");
      return;
    }
    
    if (!resolvedRecipient) {
      toast.error("Invalid recipient address");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setTxStatus('pending');
      setStatusMessage('Preparing smart contract swap...');
      
      const selectedAsset = getSelectedFromAsset();
      if (!selectedAsset || !selectedAsset.address) {
        throw new Error("Selected asset doesn't have a contract address");
      }
      
      // Convert amounts to integers (stroops)
      const amountA = BigInt(Math.floor(parseFloat(fromAmount) * 10000000)); // Convert to stroops
      const estimatedUsdcAmount = parseFloat(calculateUSDCAmount(fromAmount));
      const minBForA = BigInt(Math.floor(estimatedUsdcAmount * (1 - parseFloat(slippage) / 100) * 10000000));
      
      // For simplicity, using fixed values for the recipient side
      const amountB = BigInt(Math.floor(estimatedUsdcAmount * 10000000));
      const minAForB = BigInt(Math.floor(parseFloat(fromAmount) * (1 - parseFloat(slippage) / 100) * 10000000));
      
      setStatusMessage('Calling swap contract...');
      const tx = await contractClient.swap({
        a: publicKey,
        b: resolvedRecipient,
        token_a: XLM_CONTRACT_ADDRESS,
        token_b: USDC_CONTRACT_ADDRESS,
        amount_a: BigInt(amountA.toString()),
        min_b_for_a: BigInt(minBForA.toString()),
        amount_b: BigInt(amountB.toString()),
        min_a_for_b: BigInt(minAForB.toString())
      });
      
      setStatusMessage('Please sign the transaction in your wallet...');
      const signedTx = await tx.signAndSend();
      
      setTxStatus('success');
      setStatusMessage(`Successfully swapped ${fromAmount} ${selectedAsset.symbol} for USDC`);
      toast.success(`Successfully swapped ${fromAmount} ${selectedAsset.symbol} for USDC`);
      
      // Add to history
      const newSwap: SwapHistory = {
        id: `swap-${Date.now()}`,
        fromAsset: selectedAsset.symbol,
        toAsset: "USDC",
        fromAmount,
        toAmount: estimatedUsdcAmount.toString(),
        date: new Date().toISOString(),
        recipient: resolvedRecipient,
        recipientUsername: recipient.startsWith('@') ? recipient.substring(1) : undefined,
        status: 'completed',
        txId: signedTx?.sendTransactionResponse?.hash
      };
      
      setSwapHistory([newSwap, ...swapHistory]);
      
      // Reset form
      setFromAmount("");
      
      // Refresh balances
      setTimeout(fetchBalances, 3000);
      
    } catch (error: any) {
      console.log("Smart contract swap error:", error);
      setTxStatus('error');
      setStatusMessage(`Swap failed: ${error.message || "Unknown error"}`);
      toast.error(`Swap failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
    
    // Always try to use the atomic swap contract
    if (contractClient) {
      await handleSmartContractSwap();
      return;
    }
    
    // Fallback to traditional payment if contract client isn't available
    try {
      setIsSubmitting(true);
      setTxStatus('pending');
      setStatusMessage('Preparing swap transaction...');
      
      // Calculate USDC amount (this would use an oracle in a real app)
      const estimatedUsdcAmount = calculateUSDCAmount(fromAmount);
      
      // Use resolved recipient if it's a username, otherwise use the direct input
      const actualRecipient = resolvedRecipient || recipient;
      
      // Check if destination account exists
      let createAccount = false;
      try {
        const server = new Horizon.Server(horizonUrl);
        await server.loadAccount(actualRecipient);
      } catch (error: any) {
        if (error.status === 404) {
          createAccount = true;
          if (selectedAsset.id !== "native") {
            toast.error("New accounts can only be created with XLM");
            setTxStatus('error');
            setStatusMessage("New accounts can only be created with XLM");
            return;
          }
          if (parseFloat(fromAmount) < 1) {
            toast.error("New accounts require at least 1 XLM");
            setTxStatus('error');
            setStatusMessage("New accounts require at least 1 XLM");
            return;
          }
          toast.info("Destination account does not exist. This will create a new account.");
        } else {
          throw error;
        }
      }
      
      // Create payment transaction
      setStatusMessage('Creating transaction...');
      const { transaction, network_passphrase } = await createPaymentTransaction({
        source: publicKey,
        destination: actualRecipient,
        amount: fromAmount,
        asset: selectedAsset.id,
        memo: `Swap ${selectedAsset.symbol} to USDC`
      });
      
      // Sign the transaction
      setStatusMessage('Please sign the transaction in your wallet...');
      const signedTransaction = await sign({
        transactionXDR: transaction,
        network: network_passphrase,
      } as any);
      
      // Submit transaction to network
      setStatusMessage('Submitting transaction to the network...');
      const result = await submitTransaction(signedTransaction);
      
      // Record the transaction in history
      const recipientUsername = recipient.startsWith('@') ? recipient.substring(1) : undefined;
      
      const newSwap: SwapHistory = {
        id: `swap-${Date.now()}`,
        fromAsset: selectedAsset.symbol,
        toAsset: "USDC",
        fromAmount,
        toAmount: estimatedUsdcAmount,
        date: new Date().toISOString(),
        recipient: actualRecipient,
        recipientUsername,
        status: 'completed',
        txId: result?.hash
      };
      
      setSwapHistory([newSwap, ...swapHistory]);
      setTxStatus('success');
      setStatusMessage(`Successfully sent ${fromAmount} ${selectedAsset.symbol}`);
      toast.success(`Successfully sent ${fromAmount} ${selectedAsset.symbol}`);
      
      // Reset form
      setFromAmount("");
      
      // Refresh balances
      setTimeout(fetchBalances, 3000);
      
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
          toAsset: "USDC",
          fromAmount,
          toAmount: calculateUSDCAmount(fromAmount),
          date: new Date().toISOString(),
          recipient: resolvedRecipient || recipient,
          recipientUsername,
          status: 'failed'
        };
        setSwapHistory([failedSwap, ...swapHistory]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Calculate estimated USDC amount from the current input
  const estimatedUsdcAmount = calculateUSDCAmount(fromAmount);
  
  return (
    <div className="container mx-auto space-y-8 py-8">
      <Particles />
      <h1 className="text-3xl font-bold tracking-tight">Swap Tokens</h1>
      
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
              <CardTitle>Swap Tokens to USDC</CardTitle>
              <CardDescription>
                Send tokens to someone and they'll receive USDC via atomic swap
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
                        {userAssets.map(asset => (
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
                
                {/* To Asset (USDC) */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm font-medium">To (USDC)</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={estimatedUsdcAmount}
                      readOnly
                      className="w-full bg-transparent text-2xl font-medium focus:outline-none"
                      placeholder="0.00"
                    />
                    
                    <div className="min-w-[140px] flex items-center gap-2 justify-center border rounded-md px-3">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">$</div>
                      <span>USDC</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    USD Coin - Stellar token
                  </div>
                </div>
                
                {/* Price Info & Slippage */}
                <div className="bg-muted/20 rounded-md p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Estimated Rate</span>
                    <span className="font-medium">
                      1 {getSelectedFromAsset()?.symbol || "XLM"} ≈ 0.12 USDC
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
                      {calculateMinAmount(estimatedUsdcAmount, slippage)} USDC
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
                          : isSubmitting
                            ? 'Processing...'
                            : contractClient
                              ? 'Atomic Swap with USDC'
                              : 'Swap'}
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
                          {asset.symbol === "USDC" ? (
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">$</div>
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