"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Particles } from "@/app/components/particles"

// Mock contract interface until proper imports can be resolved
const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCYJ2GTKSRIIMURP4KOOQ7IXSPBYUXDIMWCMPQ4CQQZGEP33AWBV6FON",
  }
};

// Mock Client class
class Client {
  constructor(options: any) {
    console.log('Initialized contract client with options:', options);
  }

  async swap(params: any) {
    console.log('Called swap with params:', params);
    return {
      toXDR: () => 'MockTransactionXDR'
    };
  }
}

// Mock SorobanRpc server
const SorobanRpc = {
  Server: class Server {
    constructor(url: string) {
      console.log('Initialized Soroban RPC server with URL:', url);
    }

    async getAccount(accountId: string) {
      return { sequence: '123456' };
    }

    async sendTransaction(xdr: string) {
      console.log('Sending transaction:', xdr);
      return {
        status: 'PENDING',
        hash: 'mock_tx_' + Math.random().toString(36).substring(2, 15)
      };
    }
  }
};

// Asset types for display and selection
type Asset = {
  id: string
  symbol: string
  name: string
  balance: string
  icon: string
  address?: string // Soroban token contract address
}

type PriceData = {
  rate: number
  change24h: number
}

type SwapHistory = {
  id: string
  fromAsset: string
  toAsset: string
  fromAmount: string
  toAmount: string
  date: string
  status: 'completed' | 'pending' | 'failed'
  txId?: string
}

export default function SwapPage() {
  // State for wallet connection
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  // Real token assets would include their contract addresses on Soroban
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "xlm",
      symbol: "XLM",
      name: "Stellar Lumens",
      balance: "120.5",
      icon: "https://via.placeholder.com/32",
      address: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" 
    },
    {
      id: "usdc",
      symbol: "USDC",
      name: "USD Coin",
      balance: "250.75",
      icon: "https://via.placeholder.com/32",
      address: "CB5DW7GVQJZQIO4QBJADHXSVLZQ6WNPOWPRN4XB5HJDGPA6YVBXKCBLT" // Example address
    },
    {
      id: "cool",
      symbol: "COOL",
      name: "COOL",
      balance: "0.05",
      icon: "https://via.placeholder.com/32",
      address: "GB6MGKEZA3CL75MK4JIEAUZGH3BAWHGZLWEZ3P5HZSOYHTUPOG4WPS5I" // Example address
    },
  ])
  
  // Mock price data for UI display, would be fetched from an API in production
  const [priceData, setPriceData] = useState<{[key: string]: PriceData}>({
    "xlm-usdc": { rate: 0.12, change24h: 2.5 },
    "xlm-eth": { rate: 0.000045, change24h: -1.2 },
    "xlm-btc": { rate: 0.0000024, change24h: 0.8 },
    "usdc-xlm": { rate: 8.33, change24h: -2.5 },
    "usdc-eth": { rate: 0.00038, change24h: -3.7 },
    "usdc-btc": { rate: 0.000019, change24h: -1.7 },
    "eth-xlm": { rate: 22222.22, change24h: 1.2 },
    "eth-usdc": { rate: 2631.58, change24h: 3.7 },
    "eth-btc": { rate: 0.05, change24h: -2.0 },
    "btc-xlm": { rate: 416666.67, change24h: -0.8 },
    "btc-usdc": { rate: 52631.58, change24h: 1.7 },
    "btc-eth": { rate: 20, change24h: 2.0 }
  })
  
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([])
  
  const [fromAsset, setFromAsset] = useState("xlm")
  const [toAsset, setToAsset] = useState("usdc")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  
  // Initialize Soroban client
  const sorobanClient = new Client({
    ...networks.testnet,
    rpcUrl: "https://soroban-testnet.stellar.org:443"
  })

  // Initialize Soroban RPC server for direct API calls
  const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org:443")
  
  // Connect wallet function
  const connectWallet = async () => {
    try {
      // In a real implementation, this would use Freighter or another Stellar wallet
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const freighter = (window as any).freighter
        
        if (!await freighter.isConnected()) {
          setStatusMessage('Please install Freighter wallet extension')
          return
        }
        
        const { publicKey } = await freighter.getUserInfo()
        if (publicKey) {
          setUserPublicKey(publicKey)
          setIsWalletConnected(true)
          
          // In a production app, we would fetch real balances here
          // fetchUserBalances(publicKey)
          
          setStatusMessage('Wallet connected successfully')
        }
      } else {
        setStatusMessage('Freighter wallet not detected. Please install the extension.')
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setStatusMessage('Failed to connect wallet')
    }
  }
  
  // Get current price data for the selected asset pair
  const getCurrentPriceData = () => {
    const key = `${fromAsset}-${toAsset}`
    return priceData[key] || { rate: 0, change24h: 0 }
  }
  
  // Calculate the to amount based on from amount and rate
  useEffect(() => {
    if (fromAmount) {
      const currentPrice = getCurrentPriceData()
      const calculated = parseFloat(fromAmount) * currentPrice.rate
      setToAmount(calculated.toFixed(calculated < 0.01 ? 6 : 2))
    } else {
      setToAmount("")
    }
  }, [fromAmount, fromAsset, toAsset])
  
  // Calculate min amount based on slippage
  const calculateMinAmount = (amount: string, slippagePercent: string) => {
    const value = parseFloat(amount)
    const slippageValue = parseFloat(slippagePercent) / 100
    return (value * (1 - slippageValue)).toString()
  }
  
  // Handle swap form submit
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromAmount || !toAmount || !isWalletConnected) {
      setStatusMessage('Please connect your wallet and enter swap amounts')
      return
    }
    
    setIsSubmitting(true)
    setTxStatus('pending')
    setStatusMessage('Preparing swap transaction...')
    
    try {
      // Get the token addresses
      const fromTokenAddress = assets.find(a => a.id === fromAsset)?.address
      const toTokenAddress = assets.find(a => a.id === toAsset)?.address
      
      if (!fromTokenAddress || !toTokenAddress || !userPublicKey) {
        throw new Error('Missing token addresses or user public key')
      }
      
      // Calculate min amounts with slippage
      const minToAmount = calculateMinAmount(toAmount, slippage)
      
      // In a real implementation, we would get the counterparty address from an order book
      // For demo purposes, we're using a mock counterparty
      const counterpartyAddress = "GDXM5P2TWLSQ2WLDMQKXLBGQD6A6CBFMJTWLJ6TGEIBRI3YJV2PSM777"
      
      // Prepare swap parameters
      const tx = await sorobanClient.swap({
        a: userPublicKey,
        b: counterpartyAddress,
        token_a: fromTokenAddress,
        token_b: toTokenAddress,
        amount_a: BigInt(Math.floor(parseFloat(fromAmount) * 10000000)), // Convert to Stellar precision
        min_b_for_a: BigInt(Math.floor(parseFloat(minToAmount) * 10000000)),
        amount_b: BigInt(Math.floor(parseFloat(toAmount) * 10000000)),
        min_a_for_b: BigInt(Math.floor(parseFloat(fromAmount) * 0.95 * 10000000)), // 5% slippage for counterparty
      })
      
      setStatusMessage('Please sign the transaction in your wallet...')
      
      // In a real implementation, this would be signed by the wallet
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const signedXdr = await (window as any).freighter.signTransaction(tx.toXDR(), {
          networkPassphrase: networks.testnet.networkPassphrase,
        })
        
        // Submit the signed transaction
        setStatusMessage('Submitting transaction to the network...')
        const response = await server.sendTransaction(signedXdr)
        
        // Poll for transaction status
        let finalStatus = response.status
        let txHash = response.hash
        
        if (finalStatus === 'PENDING') {
          setStatusMessage('Transaction submitted, waiting for confirmation...')
          
          // In a real app, we would poll the transaction status here
          // For this example, we'll simulate success after a delay
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          finalStatus = 'SUCCESS'
        }
        
        if (finalStatus === 'SUCCESS') {
          // Create swap history entry
          const newSwap: SwapHistory = {
            id: `s${swapHistory.length + 1}`,
            fromAsset: assets.find(a => a.id === fromAsset)?.symbol || "",
            toAsset: assets.find(a => a.id === toAsset)?.symbol || "",
            fromAmount,
            toAmount,
            date: new Date().toISOString(),
            status: 'completed',
            txId: txHash
          }
          
          setSwapHistory([newSwap, ...swapHistory])
          
          // Update balances (in a real app, would fetch from blockchain)
          const updatedAssets = assets.map(asset => {
            if (asset.id === fromAsset) {
              const newBalance = parseFloat(asset.balance) - parseFloat(fromAmount)
              return { ...asset, balance: newBalance.toFixed(2) }
            }
            if (asset.id === toAsset) {
              const newBalance = parseFloat(asset.balance) + parseFloat(toAmount)
              return { ...asset, balance: newBalance.toFixed(2) }
            }
            return asset
          })
          
          setAssets(updatedAssets)
          setFromAmount("")
          setToAmount("")
          setTxStatus('success')
          setStatusMessage('Swap completed successfully!')
        } else {
          throw new Error(`Transaction failed with status: ${finalStatus}`)
        }
      } else {
        throw new Error('Wallet not available for signing')
      }
    } catch (error) {
      console.error('Swap error:', error)
      setTxStatus('error')
      setStatusMessage(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Add failed transaction to history
      const failedSwap: SwapHistory = {
        id: `s${swapHistory.length + 1}`,
        fromAsset: assets.find(a => a.id === fromAsset)?.symbol || "",
        toAsset: assets.find(a => a.id === toAsset)?.symbol || "",
        fromAmount,
        toAmount,
        date: new Date().toISOString(),
        status: 'failed'
      }
      
      setSwapHistory([failedSwap, ...swapHistory])
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Switch the from and to assets
  const switchAssets = () => {
    const temp = fromAsset
    setFromAsset(toAsset)
    setToAsset(temp)
    setFromAmount("")
    setToAmount("")
  }
  
  // Get max available balance for the selected asset
  const getMaxBalance = () => {
    const asset = assets.find(a => a.id === fromAsset)
    return asset ? asset.balance : "0"
  }
  
  // Set max balance to from amount
  const setMaxAmount = () => {
    setFromAmount(getMaxBalance())
  }
  
  const currentPrice = getCurrentPriceData()
  
  return (
    <div className="container mx-auto space-y-8">
      <Particles />
      <h1 className="text-3xl font-bold tracking-tight">Swap Tokens</h1>
      
      {/* Wallet Connection Status */}
      <div className="flex justify-between items-center">
        <div>
          {isWalletConnected ? (
            <div className="text-sm">
              <span className="text-green-400">●</span> Connected: {userPublicKey?.slice(0, 6)}...{userPublicKey?.slice(-4)}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Wallet not connected</div>
          )}
        </div>
        
        <Button 
          onClick={connectWallet} 
          disabled={isWalletConnected}
          variant={isWalletConnected ? "outline" : "default"}
          size="sm"
        >
          {isWalletConnected ? "Connected" : "Connect Wallet"}
        </Button>
      </div>
      
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
          <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Swap</h2>
            <form onSubmit={handleSwap} className="space-y-6">
              {/* From Asset */}
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium">From</label>
                  <button 
                    type="button" 
                    className="text-xs text-primary"
                    onClick={setMaxAmount}
                  >
                    Max: {getMaxBalance()}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="w-full bg-transparent text-2xl font-medium focus:outline-none"
                    placeholder="0.00"
                    step="any"
                    min="0"
                    required
                  />
                  
                  <select
                    value={fromAsset}
                    onChange={(e) => setFromAsset(e.target.value)}
                    className="min-w-[120px] rounded-md border border-input bg-background px-3 py-2"
                  >
                    {assets.map(asset => (
                      asset.id !== toAsset && (
                        <option key={asset.id} value={asset.id}>
                          {asset.symbol}
                        </option>
                      )
                    ))}
                  </select>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  {assets.find(a => a.id === fromAsset)?.name} - Available: {assets.find(a => a.id === fromAsset)?.balance}
                </div>
              </div>
              
              {/* Switch Button */}
              <div className="flex justify-center -my-3">
                <button 
                  type="button" 
                  onClick={switchAssets}
                  className="bg-muted rounded-full p-2 border shadow-sm hover:bg-accent"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="m17 4 3 3-3 3"></path>
                    <path d="M20 7H4"></path>
                    <path d="m7 20-3-3 3-3"></path>
                    <path d="M4 17h16"></path>
                  </svg>
                </button>
              </div>
              
              {/* To Asset */}
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium">To</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {assets.find(a => a.id === toAsset)?.balance}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={toAmount}
                    readOnly
                    className="w-full bg-transparent text-2xl font-medium focus:outline-none"
                    placeholder="0.00"
                  />
                  
                  <select
                    value={toAsset}
                    onChange={(e) => setToAsset(e.target.value)}
                    className="min-w-[120px] rounded-md border border-input bg-background px-3 py-2"
                  >
                    {assets.map(asset => (
                      asset.id !== fromAsset && (
                        <option key={asset.id} value={asset.id}>
                          {asset.symbol}
                        </option>
                      )
                    ))}
                  </select>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  {assets.find(a => a.id === toAsset)?.name}
                </div>
              </div>
              
              {/* Price Info */}
              <div className="bg-muted/20 rounded-md p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-medium">
                    1 {assets.find(a => a.id === fromAsset)?.symbol} = {currentPrice.rate} {assets.find(a => a.id === toAsset)?.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground">Price Change (24h)</span>
                  <span className={`font-medium ${currentPrice.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {currentPrice.change24h >= 0 ? '+' : ''}{currentPrice.change24h}%
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
                    {toAmount ? parseFloat(calculateMinAmount(toAmount, slippage)).toFixed(6) : '0'} {assets.find(a => a.id === toAsset)?.symbol}
                  </span>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!isWalletConnected || !fromAmount || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > parseFloat(getMaxBalance()) || isSubmitting}
              >
                {!isWalletConnected 
                  ? 'Connect Wallet' 
                  : !fromAmount 
                    ? 'Enter Amount' 
                    : parseFloat(fromAmount) > parseFloat(getMaxBalance())
                      ? 'Insufficient Balance'
                      : isSubmitting
                        ? 'Processing...'
                        : 'Swap'}
              </Button>
            </form>
          </div>
        </div>
        
        {/* Swap History */}
        <div className="col-span-1">
          <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Swap History</h3>
            <div className="space-y-4">
              {swapHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No swap history</p>
              ) : (
                swapHistory.map((swap) => (
                  <div key={swap.id} className="p-3 rounded-md border text-sm">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">
                        {swap.fromAmount} {swap.fromAsset} → {swap.toAmount} {swap.toAsset}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${swap.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : swap.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                        {swap.status}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{new Date(swap.date).toLocaleString()}</span>
                      {swap.txId && (
                        <a 
                          href={`https://testnet.stellarchain.io/tx/${swap.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono truncate max-w-[100px] hover:text-primary"
                        >
                          {swap.txId.slice(0, 8)}...
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Assets */}
          <div className="bg-white/10 rounded-xl p-6 border shadow-sm mt-4">
            <h3 className="text-lg font-semibold mb-4">Available Assets</h3>
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold">{asset.symbol}</span>
                    </div>
                    <div>
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{asset.balance}</div>
                    <div className="text-xs text-muted-foreground">Available</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 