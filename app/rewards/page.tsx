"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { Label } from "@/app/components/ui/label"
import { Input } from "@/app/components/ui/input"
import { Loader2, CoinsIcon, HistoryIcon, RefreshCw, ArrowRightIcon } from "lucide-react"
import { toast } from "sonner"
import { useWallet } from "@/app/providers/wallet-provider"
import { createChangeTrustTransaction, createPaymentTransaction, submitTransaction } from "@/lib/stellar-transactions"
import { Horizon, Asset } from "@stellar/stellar-sdk"
import { Particles } from "@/app/components/particles"
import { RewardTransactions } from "@/app/components/reward-transactions"

// Constants for SLR token
const SLR_ASSET_CODE = "SLR"
const SLR_ISSUER_WALLET = "GCCXFUMJG3YT7NWK37VFBMSLXI7HBOH6FBQHDEMTMR4ZQWVFHHTC5O2X" // This would be set to the actual issuer wallet in a real app

type RewardProgram = {
  id: string
  name: string
  description: string
  pointsEarned: number
  rewardImageUrl: string
  conditions: string[]
  rewardOptions: {
    id: string
    name: string
    description: string
    pointsCost: number
    imageUrl?: string
  }[]
}

type ActivityItem = {
  id: string
  type: 'earn' | 'redeem'
  description: string
  points: number
  date: string
}

type UserBalance = {
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  balance: string
}

export default function RewardsPage() {
  // Wallet state
  const { wallet, isConnected, publicKey, sign, currentAccount } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [hasTrustline, setHasTrustline] = useState(false)
  const [slrBalance, setSlrBalance] = useState("0")
  const [xlmSpent, setXlmSpent] = useState(0)
  const [showCreateTrustlineDialog, setShowCreateTrustlineDialog] = useState(false)
  const [slrTransactions, setSlrTransactions] = useState<any[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  
  // Reward programs state
  const [rewardPrograms, setRewardPrograms] = useState<RewardProgram[]>([
    {
      id: "rp1",
      name: "Stellera Loyalty Program",
      description: "Earn points for using the Stellera wallet and ecosystem",
      pointsEarned: 325,
      rewardImageUrl: "https://via.placeholder.com/400x200?text=Stellera+Rewards",
      conditions: [
        "1 point for every XLM transacted",
        "10 points for each new friend referred",
        "5 points for each NFT purchased or sold",
        "2 points for each recurring payment set up"
      ],
      rewardOptions: [
        {
          id: "ro1",
          name: "Network Fee Waiver",
          description: "Get free network fees for 10 transactions",
          pointsCost: 50,
        },
        {
          id: "ro2",
          name: "Premium Dashboard Access",
          description: "One month of premium analytics and reporting tools",
          pointsCost: 200,
        },
        {
          id: "ro3",
          name: "NFT Artwork",
          description: "Exclusive Stellera NFT artwork",
          pointsCost: 500,
          imageUrl: "https://via.placeholder.com/100x100?text=NFT",
        }
      ]
    },
    {
      id: "rp2",
      name: "Merchant Partner Program",
      description: "Earn rewards when you shop with our merchant partners",
      pointsEarned: 78,
      rewardImageUrl: "https://via.placeholder.com/400x200?text=Merchant+Rewards",
      conditions: [
        "2% cashback on all purchases with partner merchants",
        "Bonus points during promotional periods",
        "Double points on your first purchase with a new merchant"
      ],
      rewardOptions: [
        {
          id: "ro4",
          name: "$5 Stellar Credit",
          description: "Get $5 worth of XLM credited to your account",
          pointsCost: 100,
        },
        {
          id: "ro5",
          name: "Merchant Discount Voucher",
          description: "15% off your next purchase with any partner merchant",
          pointsCost: 200,
        }
      ]
    }
  ])
  
  const [activityHistory, setActivityHistory] = useState<ActivityItem[]>([
    {
      id: "a1",
      type: "earn",
      description: "Transaction to GDTWL...3Z6A",
      points: 25,
      date: "2023-04-25",
    },
    {
      id: "a2",
      type: "earn",
      description: "Referred a new user",
      points: 10,
      date: "2023-04-23",
    },
    {
      id: "a3",
      type: "redeem",
      description: "Redeemed Network Fee Waiver",
      points: -50,
      date: "2023-04-20",
    },
    {
      id: "a4",
      type: "earn",
      description: "Purchased NFT Ticket",
      points: 5,
      date: "2023-04-19",
    },
    {
      id: "a5",
      type: "earn",
      description: "Set up recurring payment",
      points: 2,
      date: "2023-04-18",
    }
  ])
  
  const [selectedProgram, setSelectedProgram] = useState<string>(rewardPrograms[0]?.id || "")
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false)
  const [selectedReward, setSelectedReward] = useState<RewardProgram["rewardOptions"][0] | null>(null)
  const [currentTab, setCurrentTab] = useState("slr")
  
  const totalPoints = rewardPrograms.reduce((acc, program) => acc + program.pointsEarned, 0)
  
  // Load user's SLR balance and trustline status
  useEffect(() => {
    if (isConnected && publicKey) {
      checkTrustlineAndBalance();
      fetchSlrTransactions();
    }
  }, [isConnected, publicKey]);
  
  // Calculate XLM spent from activity history (for demonstration purposes)
  useEffect(() => {
    // In a real app, this would come from tracking actual transactions
    // For demo purposes, we'll calculate a random amount based on points
    const calculatedSpent = activityHistory.reduce((acc, activity) => {
      if (activity.type === 'earn') {
        return acc + (activity.points * 4); // Each point is roughly 4 XLM in our example
      }
      return acc;
    }, 0);
    
    setXlmSpent(calculatedSpent);
  }, [activityHistory]);
  
  // Check if user has SLR trustline and get balance
  const checkTrustlineAndBalance = async () => {
    if (!publicKey) return;
    
    try {
      setIsLoading(true);
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(publicKey);
      
      // Check if user has SLR trustline
      const slrTrustline = account.balances.find((balance: UserBalance) => 
        balance.asset_type !== 'native' && 
        balance.asset_code === SLR_ASSET_CODE && 
        balance.asset_issuer === SLR_ISSUER_WALLET
      );
      
      setHasTrustline(!!slrTrustline);
      if (slrTrustline) {
        setSlrBalance(slrTrustline.balance);
      }
    } catch (error) {
      console.log("Error checking trustline:", error);
      toast.error("Failed to check SLR trustline");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create trustline for SLR
  const createTrustline = async () => {
    if (!publicKey || !currentAccount) {
      toast.error("Wallet not connected");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create a transaction to establish trustline
      const { transaction, network_passphrase } = await createChangeTrustTransaction({
        source: publicKey,
        asset: `${SLR_ASSET_CODE}:${SLR_ISSUER_WALLET}`,
      });
      
      // Sign and submit the transaction
      const signedXDR = await sign({
        transactionXDR: transaction,
        network: network_passphrase,
        pincode: "1234", // In a real app, this would be user input
      });
      
      const result = await submitTransaction(signedXDR);
      
      if (result.successful) {
        toast.success("Successfully established SLR trustline");
        setHasTrustline(true);
        setShowCreateTrustlineDialog(false);
        // Re-check balance after a short delay to allow for network propagation
        setTimeout(() => checkTrustlineAndBalance(), 2000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.log("Error creating trustline:", error);
      toast.error("Failed to create SLR trustline");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate how many SLR coins user has earned
  const calculateEarnedSLR = () => {
    // 1 SLR for every 100 XLM spent
    return Math.floor(xlmSpent / 100);
  };
  
  const handleRedeemReward = (reward: RewardProgram["rewardOptions"][0]) => {
    const program = rewardPrograms.find(p => p.id === selectedProgram)
    if (program && program.pointsEarned >= reward.pointsCost) {
      setSelectedReward(reward)
      setShowRedeemConfirm(true)
    }
  }
  
  const confirmRedemption = () => {
    if (!selectedReward) return
    
    // Find the program and update points
    const updatedPrograms = rewardPrograms.map(program => {
      if (program.id === selectedProgram) {
        return {
          ...program,
          pointsEarned: program.pointsEarned - selectedReward.pointsCost
        }
      }
      return program
    })
    
    // Add to activity history
    const newActivity: ActivityItem = {
      id: `a${activityHistory.length + 1}`,
      type: "redeem",
      description: `Redeemed ${selectedReward.name}`,
      points: -selectedReward.pointsCost,
      date: new Date().toISOString().split('T')[0]
    }
    
    setRewardPrograms(updatedPrograms)
    setActivityHistory([newActivity, ...activityHistory])
    setShowRedeemConfirm(false)
    setSelectedReward(null)
  }
  
  // Fetch SLR transactions
  const fetchSlrTransactions = async () => {
    if (!publicKey) return;
    
    try {
      setIsLoadingTransactions(true);
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      
      // Fetch operations related to SLR token
      const { records } = await server.operations()
        .forAccount(publicKey)
        .order("desc")
        .limit(20)
        .call();
      
      // Filter for operations involving SLR
      const slrOps = records.filter((op: any) => {
        return (
          // For payment operations
          (op.type === "payment" && 
           op.asset_code === SLR_ASSET_CODE && 
           op.asset_issuer === SLR_ISSUER_WALLET) ||
          // For change_trust operations
          (op.type === "change_trust" && 
           op.asset_code === SLR_ASSET_CODE && 
           op.asset_issuer === SLR_ISSUER_WALLET)
        );
      });
      
      // Map to our transaction format
      const formattedTxs = await Promise.all(slrOps.map(async (op: any) => {
        // Get the parent transaction for the operation
        const tx = await op.transaction();
        
        return {
          id: `${op.id}`,
          txHash: tx.id,
          amount: op.type === "payment" ? parseFloat(op.amount) : 0,
          date: op.created_at,
          description: op.type === "payment" 
            ? `Received ${op.amount} SLR token${parseFloat(op.amount) !== 1 ? 's' : ''}`
            : op.type === "change_trust" 
              ? "Created SLR trustline" 
              : `SLR ${op.type} operation`
        };
      }));
      
      setSlrTransactions(formattedTxs);
    } catch (error) {
      console.log("Error fetching SLR transactions:", error);
      toast.error("Failed to load SLR activity");
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Particles />
      <h1 className="text-3xl font-bold tracking-tight mb-4">Rewards</h1>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="slr">SLR Tokens</TabsTrigger>
        </TabsList>
        
        <TabsContent value="slr" className="space-y-6">
          {/* SLR Token Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <CoinsIcon className="h-5 w-5 text-amber-500" />
                  Stellera Coin (SLR)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Your Balance</div>
                    <div className="text-3xl font-bold">
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : hasTrustline ? (
                        `${Number(slrBalance).toFixed(2)} SLR`
                      ) : (
                        "No trustline"
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-1">Reward Rate</div>
                    <div className="text-lg">1 SLR per 100 XLM spent</div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-1">XLM Spent (Tracked)</div>
                    <div className="text-lg font-medium">{xlmSpent.toFixed(2)} XLM</div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-1">SLR Earned</div>
                    <div className="text-lg font-medium">{calculateEarnedSLR()} SLR</div>
                  </div>
                  
                  {!hasTrustline && isConnected && (
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => setShowCreateTrustlineDialog(true)}
                    >
                      Create SLR Trustline
                    </Button>
                  )}
                  
                  {hasTrustline && isConnected && (
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={checkTrustlineAndBalance}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh Balance
                    </Button>
                  )}
                  
                  {!isConnected && (
                    <div className="text-center text-muted-foreground mt-4">
                      Connect your wallet to manage SLR tokens
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-blue-500" />
                  About Stellera Coin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    Stellera Coin (SLR) is our platform's reward token, issued on the Stellar network.
                  </p>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">How to Earn SLR</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Automatically earn 1 SLR for every 100 XLM you spend in transactions</li>
                      <li>Complete special offers and promotions</li>
                      <li>Participate in community activities</li>
                    </ul>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Benefits of SLR</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Reduced transaction fees on the platform</li>
                      <li>Access to exclusive features and services</li>
                      <li>Trade or transfer to other users</li>
                      <li>Use as collateral in certain DeFi applications</li>
                    </ul>
                  </div>
                  
                  <div className="border-t pt-4 text-xs text-muted-foreground">
                    <p className="mb-1">SLR Asset Details:</p>
                    <p>Code: {SLR_ASSET_CODE}</p>
                    <p className="break-all">Issuer: {SLR_ISSUER_WALLET}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent SLR Activity */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold flex items-center justify-between">
                <span>Recent SLR Activity</span>
                {isConnected && hasTrustline && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchSlrTransactions}
                    disabled={isLoadingTransactions}
                  >
                    {isLoadingTransactions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                hasTrustline ? (
                  <RewardTransactions 
                    transactions={slrTransactions} 
                    isLoading={isLoadingTransactions} 
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Create a trustline to start earning SLR
                  </div>
                )
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Connect your wallet to view SLR activity
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Redemption Confirmation Dialog */}
      {selectedReward && (
        <Dialog open={showRedeemConfirm} onOpenChange={setShowRedeemConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Redemption</DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p>
                Are you sure you want to redeem <span className="font-medium">{selectedReward.name}</span> for <span className="font-medium">{selectedReward.pointsCost} points</span>?
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRedeemConfirm(false)}>Cancel</Button>
              <Button onClick={confirmRedemption}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Create Trustline Dialog */}
      <Dialog open={showCreateTrustlineDialog} onOpenChange={setShowCreateTrustlineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create SLR Trustline</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p>
              To receive Stellera Coin (SLR) rewards, you need to create a trustline for the asset on your Stellar account.
            </p>
            
            <div className="bg-muted/30 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Asset Code:</span>
                <span className="font-mono">{SLR_ASSET_CODE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issuer:</span>
                <span className="font-mono text-xs truncate max-w-[200px]">{SLR_ISSUER_WALLET}</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              This will create a transaction on the Stellar network. You will need to review and sign it to proceed.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTrustlineDialog(false)}>Cancel</Button>
            <Button 
              onClick={createTrustline}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Trustline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 