"use client"

import React, { useState } from "react"
import { Button } from "@/app/components/ui/button"

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

export default function RewardsPage() {
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
  
  const totalPoints = rewardPrograms.reduce((acc, program) => acc + program.pointsEarned, 0)
  
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
  
  return (
    <div className="container mx-auto space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Rewards</h1>
      
      {/* Points Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/10 rounded-xl border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-2">Total Points</h2>
          <div className="text-4xl font-bold text-primary mb-4">
            {totalPoints}
          </div>
          <div className="space-y-3">
            {rewardPrograms.map(program => (
              <div key={program.id} className="flex justify-between items-center">
                <span>{program.name}</span>
                <span className="font-medium">{program.pointsEarned} points</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white/10 rounded-xl border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {activityHistory.slice(0, 5).map(activity => (
              <div key={activity.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs mr-2 ${activity.type === 'earn' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                    {activity.type === 'earn' ? 'Earned' : 'Redeemed'}
                  </span>
                  {activity.description}
                </div>
                <div className="flex items-center gap-1">
                  <span className={activity.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                    {activity.type === 'earn' ? '+' : ''}{activity.points}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {new Date(activity.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Rewards Programs */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Rewards Programs</h2>
          <div>
            <select 
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {rewardPrograms.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {selectedProgram && (
          <div className="bg-white/10 rounded-xl border shadow-sm overflow-hidden">
            {rewardPrograms.map(program => (
              program.id === selectedProgram && (
                <div key={program.id}>
                  {program.rewardImageUrl && (
                    <div 
                      className="h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${program.rewardImageUrl})` }}
                    />
                  )}
                  
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{program.name}</h3>
                        <p className="text-sm text-muted-foreground">{program.description}</p>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {program.pointsEarned} points
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">How to Earn Points</h4>
                        <ul className="space-y-2 text-sm">
                          {program.conditions.map((condition, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="rounded-full bg-primary/10 p-1 text-primary mt-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </div>
                              {condition}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Available Rewards</h4>
                        <div className="space-y-3">
                          {program.rewardOptions.map(reward => (
                            <div key={reward.id} className="flex justify-between border rounded-lg p-3">
                              <div className="flex gap-3">
                                {reward.imageUrl && (
                                  <div 
                                    className="h-12 w-12 bg-cover bg-center rounded"
                                    style={{ backgroundImage: `url(${reward.imageUrl})` }}
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{reward.name}</div>
                                  <div className="text-xs text-muted-foreground">{reward.description}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end justify-between">
                                <div className="text-sm font-medium">
                                  {reward.pointsCost} points
                                </div>
                                <Button 
                                  size="sm" 
                                  variant={program.pointsEarned >= reward.pointsCost ? "default" : "outline"}
                                  disabled={program.pointsEarned < reward.pointsCost}
                                  onClick={() => handleRedeemReward(reward)}
                                >
                                  Redeem
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
      
      {/* Redemption Confirmation Modal */}
      {showRedeemConfirm && selectedReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Confirm Redemption</h2>
            <div className="mb-4">
              <p>
                You are about to redeem <span className="font-semibold">{selectedReward.name}</span> for <span className="font-semibold">{selectedReward.pointsCost} points</span>.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This action cannot be undone. Your points will be deducted immediately.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setShowRedeemConfirm(false)
                  setSelectedReward(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmRedemption}>
                Confirm Redemption
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 