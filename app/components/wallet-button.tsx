"use client"

import { useWallet } from "@/app/providers/wallet-provider"
import { Button } from "@/app/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function WalletButton() {
  const { isConnected, connect, disconnect, wallet, isLoading, error } = useWallet()

  const handleConnect = async () => {
    try {
      await connect()
      // After successful connection, you can get the account info
      if (wallet) {
        const stellar = wallet.stellar()
        // You can now use stellar to interact with the network
        // For example: stellar.accounts().accountId("your-account-id")
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      toast.error("Failed to connect wallet")
    }
  }

  if (error) {
    toast.error(error)
  }

  return (
    <Button
      variant={isConnected ? "default" : "outline"}
      size="sm"
      onClick={isConnected ? disconnect : handleConnect}
      className="relative"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isConnected ? "Disconnecting..." : "Connecting..."}
        </>
      ) : isConnected ? (
        <>
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Connected
        </>
      ) : (
        "Connect Wallet"
      )}
    </Button>
  )
} 