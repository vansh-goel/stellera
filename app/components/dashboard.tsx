"use client"

import { useEffect, useState } from "react"
import { Button } from "@/app/components/ui/button"
import { useWallet } from "@/app/providers/wallet-provider"
import { toast } from "sonner"
import { WalletSwitcher } from "@/app/components/wallet-switcher"
import { RecentTransactions } from "@/app/components/recent-transactions"

export function Dashboard() {
  const { wallet, isConnected, publicKey, fundTestnetAccount, getBalance, isTestnet } = useWallet()
  const [balance, setBalance] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallet || !isConnected || !publicKey) return

      try {
        setIsLoading(true)
        const newBalance = await getBalance()
        setBalance(newBalance)
      } catch (error) {
        console.error("Failed to fetch balance:", error)
        toast.error("Failed to fetch account balance")
      } finally {
        setIsLoading(false)
      }
    }

    if (publicKey) {
      fetchBalance()
    }
  }, [wallet, isConnected, publicKey, getBalance])

  const handleFundAccount = async () => {
    try {
      await fundTestnetAccount()
      toast.success("Account funded successfully!")
      // Refresh balance after funding
      const newBalance = await getBalance()
      setBalance(newBalance)
    } catch (error) {
      console.error("Failed to fund account:", error)
      toast.error("Failed to fund account")
    }
  }

  return (
    <div className="py-8 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute -right-20 top-10 w-80 h-80 rounded-full bg-primary/10 blur-[100px] opacity-40 z-0"></div>
          <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px] opacity-40 z-0"></div>
          
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 gradient-text">
              Welcome to your Stellar Wallet
            </h1>
            <div className="flex items-center gap-4 mb-10">
              <WalletSwitcher />
              {isTestnet && (
                <Button variant="outline" size="sm" onClick={handleFundAccount}>
                  Fund Testnet Account
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-5">
              <Button variant="cosmic" size="lg" className="rounded-xl">
                Send Payment
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl">
                Swap Assets
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Balance Overview */}
      <section className="py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Your Balance</h2>
          <div className="text-3xl font-bold">
            {isLoading ? "Loading..." : `${balance} XLM`}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="">
        <h2 className="text-2xl font-semibold mb-8">Recent Transactions</h2>
        <RecentTransactions />
      </section>
    </div>
  )
}