"use client"

import { formatDistanceToNow } from "date-fns"
import { ExternalLink, Coins } from "lucide-react"
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/app/components/ui/card"

// Define the type for a reward transaction
type RewardTransaction = {
  id: string
  txHash: string
  amount: number
  date: string
  description: string
}

// Helper function to get Stellar Explorer URL
const getExplorerUrl = (txHash: string): string => {
  // Determine if we're using testnet or public network
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
};

interface RewardTransactionsProps {
  transactions: RewardTransaction[]
  isLoading?: boolean
}

export function RewardTransactions({ transactions, isLoading = false }: RewardTransactionsProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-100/5 rounded-lg p-4 border border-gray-800/50">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 bg-gray-200/10 rounded w-24"></div>
              <div className="h-4 bg-gray-200/10 rounded w-32"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200/10 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200/10 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-100/5 rounded-lg border border-gray-800/50">
        <Coins className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-400">No reward transactions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <Card key={tx.id} className="bg-gray-100/5 border-gray-800/50 hover:border-gray-700/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">
                  {tx.amount.toFixed(2)} SLR
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {formatDistanceToNow(new Date(tx.date), { addSuffix: true })}
              </span>
            </div>
            
            <div className="text-sm text-gray-300 mb-3">
              {tx.description}
            </div>
            
            {/* Explorer Link */}
            <div className="flex justify-end">
              <a
                href={getExplorerUrl(tx.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-md bg-primary/10"
                title="View on Stellar Explorer"
              >
                <ExternalLink className="w-3 h-3" />
                Explorer
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 