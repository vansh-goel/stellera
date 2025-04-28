"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"

// Types
interface Asset {
  id: string
  name: string
  symbol: string
  balance: number
  icon: string
}

interface UserPayment {
  id: string
  username: string
  address: string
  avatar: string
  date: string
  amount: number
  asset: string
  status: "completed" | "pending" | "failed"
}

export default function UsernamePay() {
  // Mock data
  const assets: Asset[] = [
    { id: "1", name: "Stellar Lumens", symbol: "XLM", balance: 1045.75, icon: "/xlm-icon.png" },
    { id: "2", name: "USD Coin", symbol: "USDC", balance: 500.50, icon: "/usdc-icon.png" },
    { id: "3", name: "Stellar Euro", symbol: "EURX", balance: 320.30, icon: "/eur-icon.png" },
  ]

  const recentPayments: UserPayment[] = [
    {
      id: "1",
      username: "sarah_stellar",
      address: "GDKJTXGFV...ZAH65TK",
      avatar: "",
      date: "2023-11-15T14:30:00Z",
      amount: 25,
      asset: "XLM",
      status: "completed"
    },
    {
      id: "2",
      username: "cosmic_crypto",
      address: "GCIZJ63LJ...OABCFE3",
      avatar: "",
      date: "2023-11-14T09:15:00Z",
      amount: 50,
      asset: "USDC",
      status: "completed"
    },
    {
      id: "3",
      username: "stellar_dev",
      address: "GDJYZ54KD...ZSO42LP",
      avatar: "",
      date: "2023-11-13T19:45:00Z",
      amount: 15.5,
      asset: "EURX",
      status: "failed"
    }
  ]

  // State
  const [username, setUsername] = useState("")
  const [amount, setAmount] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0])
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [userAddress, setUserAddress] = useState("")
  const [paymentHistory, setPaymentHistory] = useState<UserPayment[]>(recentPayments)

  // Handlers
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)
    
    // Mock validation
    if (value.length > 3) {
      setUsernameValid(true)
      // In a real app, this would make an API call to check if username exists
      setUserAddress("GD5DJQDAX...VB4ZBNF")
    } else {
      setUsernameValid(value.length === 0 ? null : false)
      setUserAddress("")
    }
  }

  const handleAssetChange = (value: string) => {
    const asset = assets.find(a => a.id === value)
    if (asset) {
      setSelectedAsset(asset)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers with up to 7 decimal places
    if (/^\d*\.?\d{0,7}$/.test(value) || value === "") {
      setAmount(value)
    }
  }

  const handleSendPayment = () => {
    if (!username || !amount || parseFloat(amount) <= 0 || !usernameValid) {
      return
    }

    // Mock payment processing
    const newPayment: UserPayment = {
      id: `${Date.now()}`,
      username,
      address: userAddress,
      avatar: "",
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      asset: selectedAsset.symbol,
      status: "completed"
    }

    // Add to payment history
    setPaymentHistory([newPayment, ...paymentHistory])

    // Reset form
    setUsername("")
    setAmount("")
    setUsernameValid(null)
    setUserAddress("")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Username Pay</h1>
        <p className="text-muted-foreground">Send payments to Stellar addresses using easy-to-remember usernames</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send Payment</CardTitle>
            <CardDescription>
              Enter a username to send funds instantly without lengthy addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input 
                  id="username" 
                  value={username}
                  onChange={handleUsernameChange}
                  className="pl-8"
                  placeholder="recipient_username"
                />
              </div>
              {usernameValid === false && (
                <p className="text-sm text-destructive">Username not found</p>
              )}
              {usernameValid === true && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <span>✓ Username found</span>
                  <span className="text-xs text-muted-foreground">{userAddress}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select onValueChange={handleAssetChange} defaultValue={selectedAsset.id}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10" />
                        <span>{asset.name} ({asset.symbol})</span>
                        <span className="ml-auto text-muted-foreground">{asset.balance} {asset.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount</Label>
                <span className="text-xs text-muted-foreground">
                  Available: {selectedAsset.balance} {selectedAsset.symbol}
                </span>
              </div>
              <div className="relative">
                <Input
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  type="text"
                  inputMode="decimal"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {selectedAsset.symbol}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">Memo (Optional)</Label>
              <Input id="memo" placeholder="Add a note" />
              <p className="text-xs text-muted-foreground">
                Max 28 characters for text memos
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleSendPayment}
              disabled={!username || !amount || parseFloat(amount) <= 0 || !usernameValid}
            >
              Send Payment
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Your recent username payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recent payments</p>
                ) : (
                  paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{payment.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">@{payment.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.date).toLocaleDateString()} - {new Date(payment.date).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {payment.amount} {payment.asset}
                        </div>
                        <div className={`text-xs ${
                          payment.status === "completed" ? "text-green-500" : 
                          payment.status === "pending" ? "text-yellow-500" : "text-red-500"
                        }`}>
                          {payment.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Username</CardTitle>
              <CardDescription>Manage your Stellar username identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>SU</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-bold">@stellar_user</div>
                  <div className="text-xs text-muted-foreground">Connected to GDUL5T2...KBU4Z</div>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">Edit Profile</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 