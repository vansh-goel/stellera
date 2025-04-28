"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/app/components/ui/button"

export default function WalletPage() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [balance, setBalance] = useState<{ [key: string]: string }>({
    XLM: "0",
    USDC: "0",
  })
  const [transactions, setTransactions] = useState<Array<{
    id: string
    type: "send" | "receive"
    amount: string
    asset: string
    date: string
    recipient?: string
    sender?: string
    memo?: string
  }>>([])
  
  // Mock connect wallet functionality
  const connectWallet = () => {
    // In a real implementation, this would connect to Stellar
    setWalletConnected(true)
    setBalance({
      XLM: "120.5",
      USDC: "250.75",
    })
    
    // Mock transaction data
    setTransactions([
      {
        id: "tx1",
        type: "receive",
        amount: "25.0",
        asset: "XLM",
        date: "2023-04-24T14:30:00Z",
        sender: "GDTWL...3Z6A",
        memo: "Payment for services",
      },
      {
        id: "tx2",
        type: "send",
        amount: "10.0",
        asset: "XLM",
        date: "2023-04-23T10:15:00Z",
        recipient: "GDSHT...8FRW",
      },
      {
        id: "tx3",
        type: "receive",
        amount: "50.0",
        asset: "USDC",
        date: "2023-04-22T18:45:00Z",
        sender: "GDPQW...7TRG",
      },
    ])
  }
  
  return (
    <div className="container mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your Wallet</h1>
      
      {!walletConnected ? (
        <div className="flex flex-col items-center justify-center mt-12 p-8 border rounded-xl bg-muted/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">Connect your Stellar wallet to manage your assets.</p>
          </div>
          <Button onClick={connectWallet} size="lg">Connect Wallet</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="col-span-1 md:col-span-2 space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(balance).map(([asset, amount]) => (
                <div key={asset} className="bg-white/10 rounded-xl p-6 border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-primary/10 p-1 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 18v-6"></path>
                        <path d="M8 10h8"></path>
                      </svg>
                    </div>
                    <h3 className="font-medium">{asset}</h3>
                  </div>
                  <div className="text-2xl font-bold">{amount}</div>
                </div>
              ))}
            </div>
            
            {/* Send & Receive */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Send</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Recipient Address</label>
                    <input
                      type="text"
                      placeholder="G..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount</label>
                      <input
                        type="text"
                        placeholder="0.00"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Asset</label>
                      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option>XLM</option>
                        <option>USDC</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Memo (Optional)</label>
                    <input
                      type="text"
                      placeholder="Add a message"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <Button className="w-full">Send Payment</Button>
                </form>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Receive</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Address</label>
                    <div className="flex">
                      <input
                        type="text"
                        readOnly
                        value="G35IUZF78COLG6UEFYWGQYPDET7PLMROMGZI7SEQELL2SYAYAYOZEK3S"
                        className="w-full rounded-l-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground truncate"
                      />
                      <Button variant="outline" className="rounded-l-none">
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-center py-4">
                    <div className="border border-input p-2 rounded bg-background">
                      {/* This would be a QR code in a real application */}
                      <div className="w-32 h-32 bg-primary/10 flex items-center justify-center text-xs text-center text-muted-foreground">
                        QR Code Placeholder
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Transaction History */}
          <div className="col-span-1 bg-white/10 rounded-xl p-6 border shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-md border">
                  <div className={`rounded-full ${tx.type === 'receive' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400'} p-1.5`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      {tx.type === 'receive' ? (
                        <polyline points="9 14 4 9 9 4"></polyline>
                      ) : (
                        <polyline points="15 10 20 15 15 20"></polyline>
                      )}
                      {tx.type === 'receive' ? (
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                      ) : (
                        <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                      )}
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{tx.type === 'receive' ? 'Received' : 'Sent'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.type === 'receive' ? `From: ${tx.sender}` : `To: ${tx.recipient}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === 'receive' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.asset}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {tx.memo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Memo: {tx.memo}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 