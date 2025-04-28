"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"

type Asset = {
  id: string
  symbol: string
  name: string
  balance: string
  icon: string
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
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "xlm",
      symbol: "XLM",
      name: "Stellar Lumens",
      balance: "120.5",
      icon: "https://via.placeholder.com/32"
    },
    {
      id: "usdc",
      symbol: "USDC",
      name: "USD Coin",
      balance: "250.75",
      icon: "https://via.placeholder.com/32"
    },
    {
      id: "eth",
      symbol: "ETH",
      name: "Ethereum",
      balance: "0.05",
      icon: "https://via.placeholder.com/32"
    },
    {
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      balance: "0.002",
      icon: "https://via.placeholder.com/32"
    }
  ])
  
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
  
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([
    {
      id: "s1",
      fromAsset: "XLM",
      toAsset: "USDC",
      fromAmount: "100",
      toAmount: "12",
      date: "2023-04-25T10:15:00Z",
      status: "completed",
      txId: "tx47843..."
    },
    {
      id: "s2",
      fromAsset: "USDC",
      toAsset: "ETH",
      fromAmount: "50",
      toAmount: "0.019",
      date: "2023-04-20T14:30:00Z",
      status: "completed",
      txId: "tx93726..."
    }
  ])
  
  const [fromAsset, setFromAsset] = useState("xlm")
  const [toAsset, setToAsset] = useState("usdc")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  
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
  
  // Handle swap form submit
  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromAmount || !toAmount) return
    
    // In a real app, this would create a Stellar swap transaction
    const newSwap: SwapHistory = {
      id: `s${swapHistory.length + 1}`,
      fromAsset: assets.find(a => a.id === fromAsset)?.symbol || "",
      toAsset: assets.find(a => a.id === toAsset)?.symbol || "",
      fromAmount,
      toAmount,
      date: new Date().toISOString(),
      status: "completed",
      txId: `tx${Math.floor(Math.random() * 100000)}...`
    }
    
    setSwapHistory([newSwap, ...swapHistory])
    
    // Update balances
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
      <h1 className="text-3xl font-bold tracking-tight">Swap Tokens</h1>
      
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
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!fromAmount || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > parseFloat(getMaxBalance())}
              >
                {!fromAmount 
                  ? 'Enter Amount' 
                  : parseFloat(fromAmount) > parseFloat(getMaxBalance())
                    ? 'Insufficient Balance'
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
                      <span className="font-mono truncate max-w-[100px]">{swap.txId}</span>
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