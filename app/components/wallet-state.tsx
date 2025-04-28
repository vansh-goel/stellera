"use client"

import { useWallet } from "@/app/providers/wallet-provider"
import { NoWallet } from "./no-wallet"
import { Navbar } from "./navbar"
import { Sidebar } from "./sidebar"

interface WalletStateProps {
  children: React.ReactNode
}

export function WalletState({ children }: WalletStateProps) {
  const { hasDefaultWallet, isLoading } = useWallet()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!hasDefaultWallet) {
    return <NoWallet />
  }

  return (
    <>
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-64">
        <Navbar />
        <main className="flex-1 px-4 md:px-8 pt-24 pb-12">{children}</main>
      </div>
    </>
  )
} 