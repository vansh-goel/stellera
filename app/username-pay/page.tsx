"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { useWallet } from "@/app/providers/wallet-provider"
import { useUsername } from "@/app/hooks/use-username"
import { RecipientInput } from "@/app/components/recipient-input"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import StellarSdk, { Horizon } from "@stellar/stellar-sdk"
import { createPaymentTransaction, submitTransaction } from "@/lib/stellar-transactions"

// Network configuration
const horizonUrl = "https://horizon-testnet.stellar.org";

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
  const { wallet, isConnected, publicKey, getBalance, sign, currentAccount } = useWallet()
  const { username, loadUsername } = useUsername()
  
  // State
  const [assets, setAssets] = useState<Asset[]>([
    { id: "1", name: "Stellar Lumens", symbol: "XLM", balance: 0, icon: "/xlm-icon.png" },
  ])
  const [paymentHistory, setPaymentHistory] = useState<UserPayment[]>([])
  const [recipient, setRecipient] = useState("")
  const [resolvedRecipient, setResolvedRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0])
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [isSendingPayment, setIsSendingPayment] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  
  // Load user data
  useEffect(() => {
    if (isConnected && publicKey) {
      loadUsername();
      fetchBalances();
      fetchTransactions();
    }
  }, [isConnected, publicKey]);
  
  // Fetch user balances
  const fetchBalances = async () => {
    if (!publicKey) return;
    
    try {
      setIsLoadingBalance(true);
      const xlmBalance = await getBalance();
      
      // Fetch other asset balances from Horizon
      const server = new Horizon.Server(horizonUrl);
      const account = await server.loadAccount(publicKey);
      
      const updatedAssets: Asset[] = [
        { id: "native", name: "Stellar Lumens", symbol: "XLM", balance: parseFloat(xlmBalance), icon: "/xlm-icon.png" },
      ];
      
      // Add other assets from account
      account.balances.forEach((balance: any) => {
        if (balance.asset_type !== 'native') {
          const assetCode = balance.asset_code;
          updatedAssets.push({
            id: `${assetCode}:${balance.asset_issuer}`,
            name: assetCode,
            symbol: assetCode,
            balance: parseFloat(balance.balance),
            icon: `/assets/${assetCode.toLowerCase()}-icon.png`,
          });
        }
      });
      
      setAssets(updatedAssets);
      if (updatedAssets.length > 0) {
        setSelectedAsset(updatedAssets[0]);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      toast.error("Failed to load balances");
    } finally {
      setIsLoadingBalance(false);
    }
  };
  
  // Fetch recent transactions
  const fetchTransactions = async () => {
    if (!publicKey) return;
    
    try {
      const server = new Horizon.Server(horizonUrl);
      const { records } = await server.transactions()
        .forAccount(publicKey)
        .order("desc")
        .limit(10)
        .call();
      
      const processedTxs = await Promise.all(
        records.map(async (tx) => {
          const operations = await tx.operations();
          
          // Only include payment operations
          const paymentOps = operations.records.filter(
            (op) => op.type === "payment" || op.type === "create_account"
          );
          
          // Map to our payment format
          return paymentOps.map((op) => {
            let isOutgoing = false;
            let fromAddress = "";
            let toAddress = "";
            let assetCode = "XLM";
            let amount = "0";
            
            // Handle different operation types
            if (op.type === "create_account") {
              isOutgoing = op.funder === publicKey;
              fromAddress = op.funder || "";
              toAddress = op.account || "";
              amount = op.starting_balance || "0";
            } else if (op.type === "payment") {
              isOutgoing = op.from === publicKey;
              fromAddress = op.from || "";
              toAddress = op.to || "";
              amount = op.amount || "0";
              assetCode = op.asset_type === "native" ? "XLM" : op.asset_code || "XLM";
            }
            
            const username = isOutgoing ? recipient.startsWith('@') ? recipient.substring(1) : "" : "";
            
            return {
              id: tx.id + (op.id || Date.now().toString()),
              username: username,
              address: isOutgoing ? toAddress : fromAddress,
              avatar: "",
              date: tx.created_at,
              amount: parseFloat(amount),
              asset: assetCode,
              status: tx.successful ? "completed" : "failed"
            };
          });
        })
      );
      
      // Flatten and filter out empty arrays
      const flattenedTxs = processedTxs.flat().filter(tx => tx && tx.address);
      setPaymentHistory(flattenedTxs as UserPayment[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleAssetChange = (value: string) => {
    const asset = assets.find(a => a.id === value);
    if (asset) {
      setSelectedAsset(asset);
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers with up to 7 decimal places
    if (/^\d*\.?\d{0,7}$/.test(value) || value === "") {
      setAmount(value);
    }
  }

  const handleSendPayment = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0 || !publicKey || !currentAccount) {
      toast.error("Please enter recipient and amount");
      return;
    }

    try {
      setIsSendingPayment(true);
      const amountNum = parseFloat(amount);
      
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
            return;
          }
          if (amountNum < 1) {
            toast.error("New accounts require at least 1 XLM");
            return;
          }
          toast.info("Destination account does not exist. This will create a new account.");
        } else {
          throw error;
        }
      }
      
      // Create payment transaction
      const { transaction, network_passphrase } = await createPaymentTransaction({
        source: publicKey,
        destination: actualRecipient,
        amount,
        asset: selectedAsset.id,
        memo
      });
      
      // Sign the transaction
      const signedTransaction = await sign({
        transactionXDR: transaction,
        network: network_passphrase,
      } as any);
      
      // Submit transaction to network
      const result = await submitTransaction(signedTransaction);
      
      toast.success("Payment sent successfully!");
      
      // Create a local payment record for immediate display
      const newPayment: UserPayment = {
        id: `local-${Date.now()}`,
        username: recipient.startsWith('@') ? recipient.substring(1) : "",
        address: actualRecipient,
        avatar: "",
        date: new Date().toISOString(),
        amount: amountNum,
        asset: selectedAsset.symbol,
        status: "completed"
      };
      
      // Add to payment history
      setPaymentHistory([newPayment, ...paymentHistory]);
      
      // Reset form
      setRecipient("");
      setResolvedRecipient("");
      setAmount("");
      setMemo("");
      
      // Refresh balances and transactions
      setTimeout(() => {
        fetchBalances();
        fetchTransactions();
      }, 2000);
      
    } catch (error: any) {
      console.error("Payment failed:", error);
      toast.error(`Payment failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSendingPayment(false);
    }
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
                        <span className="ml-auto text-muted-foreground">{asset.balance.toFixed(7)} {asset.symbol}</span>
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
                  {isLoadingBalance ? (
                    <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                  ) : (
                    <>Available: {selectedAsset.balance.toFixed(7)} {selectedAsset.symbol}</>
                  )}
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
              <Input 
                id="memo" 
                placeholder="Add a note" 
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={28}
              />
              <p className="text-xs text-muted-foreground">
                Max 28 characters for text memos
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleSendPayment}
              disabled={!recipient || !amount || parseFloat(amount) <= 0 || isSendingPayment}
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
                  <div className="max-h-[400px] overflow-y-auto pr-1">
                    {paymentHistory.map((payment) => (
                      payment.address ? (
                        <div key={payment.id} className="flex items-center justify-between border-b pb-3 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {payment.username 
                                  ? payment.username.substring(0, 2).toUpperCase() 
                                  : payment.address.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {payment.username 
                                  ? `@${payment.username}` 
                                  : `${payment.address.substring(0, 6)}...${payment.address.substring(payment.address.length - 4)}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(payment.date).toLocaleDateString()} - {new Date(payment.date).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {payment.amount.toFixed(7)} {payment.asset}
                            </div>
                            <div className={`text-xs ${
                              payment.status === "completed" ? "text-green-500" : 
                              payment.status === "pending" ? "text-yellow-500" : "text-red-500"
                            }`}>
                              {payment.status}
                            </div>
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
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
              {isConnected ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>
                      {username ? username.substring(0, 2).toUpperCase() : publicKey?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {username ? (
                      <div className="text-lg font-bold">@{username}</div>
                    ) : (
                      <div className="text-lg font-bold text-muted-foreground">No username set</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Connected to {publicKey ? `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}` : ''}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Connect your wallet to view your username</p>
                </div>
              )}
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = '/profile'}
                >
                  {username ? "Edit Username" : "Set Username"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 