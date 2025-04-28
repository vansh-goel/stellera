"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@/app/providers/wallet-provider"
import { formatDistanceToNow } from "date-fns"
import { Horizon } from "@stellar/stellar-sdk"
import { CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react"

interface Transaction {
  id: string
  status: string
  ledger: number
  createdAt: number
  fee: string
  memo?: string
  operations: {
    type: string
    amount?: string
    asset?: string
    from?: string
    to?: string
  }[]
}

export function RecentTransactions() {
  const { publicKey } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!publicKey) return

      try {
        setLoading(true)
        setError(null)

        const server = new Horizon.Server("https://horizon-testnet.stellar.org")
        
        const { records } = await server.transactions()
          .forAccount(publicKey)
          .order("desc")
          .limit(5)
          .call()

        const formattedTransactions = await Promise.all(records.map(async tx => {
          const operations = await tx.operations()
          return {
            id: tx.id,
            status: tx.successful ? "SUCCESS" : "FAILED",
            ledger: tx.ledger_attr,
            createdAt: new Date(tx.created_at).getTime(),
            fee: tx.fee_charged.toString(),
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

        setTransactions(formattedTransactions)
      } catch (err) {
        console.error("Failed to fetch transactions:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [publicKey])

  if (!publicKey) {
    return null
  }

  if (loading) {
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
      <h2 className="text-lg font-semibold text-gray-200">Recent Transactions</h2>
      {transactions.length === 0 ? (
        <div className="text-center py-8 bg-gray-100/5 rounded-lg border border-gray-800/50">
          <Clock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-400">No recent transactions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div 
              key={tx.id} 
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

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">Operations</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 