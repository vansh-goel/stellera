"use client"

import { useEffect, useState, useRef } from "react"
import { useWallet } from "@/app/providers/wallet-provider"
import { formatDistanceToNow } from "date-fns"
import { Horizon } from "@stellar/stellar-sdk"
import { CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Transaction {
  id: string
  status: string
  ledger: number
  createdAt: number
  fee: string
  memo?: string
  isNew?: boolean
  operations: {
    type: string
    amount?: string
    asset?: string
    from?: string
    to?: string
  }[]
}

// Helper function to get Stellar Explorer URL
const getExplorerUrl = (txHash: string): string => {
  // Determine if we're using testnet or public network
  // For simplicity, we'll default to testnet in this example
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
};

interface RecentTransactionsProps {
  refreshTrigger: number;
}

export function RecentTransactions({ refreshTrigger }: RecentTransactionsProps) {
  const { publicKey } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevTransactionsRef = useRef<Transaction[]>([])

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!publicKey) return

      try {
        // Only update loading state if this is the initial fetch
        if (isInitialLoading) {
          setIsPolling(false)
        } else {
          setIsPolling(true)
        }
        
        setError(null)

        const server = new Horizon.Server("https://horizon-testnet.stellar.org")
        
        const { records } = await server.transactions()
          .forAccount(publicKey)
          .order("desc")
          .limit(5)
          .call()

        const newTransactions = await Promise.all(records.map(async tx => {
          const operations = await tx.operations()
          return {
            id: tx.id,
            status: tx.successful ? "SUCCESS" : "FAILED",
            ledger: tx.ledger_attr,
            createdAt: new Date(tx.created_at).getTime(),
            fee: (Number(tx.fee_charged) / 10000000).toString(),
            memo: tx.memo,
            operations: operations.records.map(op => {
              const baseOp = {
                type: op.type,
              }

              // Handle payment operations
              if (op.type === "payment") {
                return {
                  ...baseOp,
                  amount: op.amount,
                  asset: op.asset_type === "native" ? "XLM" : op.asset_code,
                  from: op.from,
                  to: op.to,
                }
              }

              // Handle create account operations
              if (op.type === "create_account") {
                return {
                  ...baseOp,
                  amount: op.starting_balance,
                  from: op.funder,
                  to: op.account,
                }
              }

              // Handle other operation types
              return baseOp
            }),
          }
        }))

        // Check if transactions have changed by comparing IDs
        const hasChanged = hasTransactionsChanged(prevTransactionsRef.current, newTransactions)
        
        if (hasChanged) {
          // Mark new transactions for animation
          const enhancedTransactions = newTransactions.map(tx => {
            const isNew = !prevTransactionsRef.current.some(prevTx => prevTx.id === tx.id)
            return { ...tx, isNew }
          })
          
          // Update state with new transactions
          setTransactions(enhancedTransactions)
          
          // Store current transactions for future comparison
          prevTransactionsRef.current = newTransactions
        }
      } catch (err) {
        console.log("Failed to fetch transactions:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      } finally {
        setIsInitialLoading(false)
        setIsPolling(false)
      }
    }

    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, refreshTrigger])
  
  // Helper function to compare transaction arrays
  const hasTransactionsChanged = (prevTxs: Transaction[], newTxs: Transaction[]): boolean => {
    if (prevTxs.length !== newTxs.length) return true
    
    // Create sets of transaction IDs for comparison
    const prevIds = new Set(prevTxs.map(tx => tx.id))
    const newIds = new Set(newTxs.map(tx => tx.id))
    
    // Check if any new ID is not in previous IDs
    for (const id of newIds) {
      if (!prevIds.has(id)) return true
    }
    
    return false
  }

  if (!publicKey) {
    return null
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
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
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-500">Error loading transactions: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-200">Recent Transactions</h2>
        {isPolling && (
          <div className="flex justify-end">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-gray-400 border-r-transparent"></div>
          </div>
        )}
      </div>
      {transactions.length === 0 ? (
        <div className="text-center py-8 bg-gray-100/5 rounded-lg border border-gray-800/50">
          <Clock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-400">No recent transactions</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {transactions.map((tx) => (
              <motion.div 
                key={tx.id}
                initial={tx.isNew ? { y: -20, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-100/5 rounded-lg p-4 border border-gray-800/50 hover:border-gray-700/50 transition-colors"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    {tx.status === "SUCCESS" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      tx.status === "SUCCESS" ? "text-green-500" : "text-red-500"
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-400">Ledger</p>
                      <p className="text-gray-200">#{tx.ledger}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-400">Fee</p>
                      <p className="text-gray-200">{tx.fee} XLM</p>
                    </div>
                  </div>

                  {tx.memo && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400">Memo</p>
                      <p className="text-sm text-gray-200">{tx.memo}</p>
                    </div>
                  )}

                  {/* Explorer Link */}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-300">Operations</p>
                                    <div className="mt-3 flex justify-end">
                    <a
                      href={getExplorerUrl(tx.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-md bg-primary/10"
                      title="View on Stellar Explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Explorer
                    </a>
                    </div>
                  </div>
                    {tx.operations.map((op, index) => (
                      <div 
                        key={index} 
                        className="p-3 bg-gray-100/5 rounded border border-gray-800/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300 capitalize">
                            {op.type.replace(/_/g, ' ')}
                          </span>
                          {op.amount && (
                            <span className="text-sm font-medium text-gray-200">
                              {op.amount} {op.asset || 'XLM'}
                            </span>
                          )}
                        </div>
                        {(op.from || op.to) && (
                          <div className="space-y-1 text-sm">
                            {op.from && (
                              <div className="flex items-center text-gray-400">
                                <ArrowUpRight className="w-4 h-4 mr-1" />
                                <span className="truncate">{op.from}</span>
                              </div>
                            )}
                            {op.to && (
                              <div className="flex items-center text-gray-400">
                                <ArrowDownLeft className="w-4 h-4 mr-1" />
                                <span className="truncate">{op.to}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
} 