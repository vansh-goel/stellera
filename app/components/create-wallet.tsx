"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { useWallet } from "@/app/providers/wallet-provider"
import { Keypair } from "@stellar/stellar-sdk"
import { toast } from "sonner"

export function CreateWallet() {
  const [isCreating, setIsCreating] = useState(false)
  const [secretKey, setSecretKey] = useState("")
  const { wallet, connect } = useWallet()

  const handleCreateWallet = async () => {
    try {
      setIsCreating(true)
      
      // Generate a new keypair using Stellar SDK
      const keypair = Keypair.random()
      
      // Store the secret key securely (in a real app, you'd want to encrypt this)
      localStorage.setItem("stellera_secret_key", keypair.secret())
      
      // Store the public key
      localStorage.setItem("stellera_public_key", keypair.publicKey())
      
      // Connect the wallet
      await connect()
      
      toast.success("Wallet created successfully!")
    } catch (error) {
      console.error("Failed to create wallet:", error)
      toast.error("Failed to create wallet")
    } finally {
      setIsCreating(false)
    }
  }

  const handleImportWallet = async () => {
    try {
      if (!secretKey) {
        toast.error("Please enter a secret key")
        return
      }

      setIsCreating(true)
      
      // Validate the secret key using Stellar SDK
      const keypair = Keypair.fromSecret(secretKey)
      
      // Store the secret key securely
      localStorage.setItem("stellera_secret_key", keypair.secret())
      
      // Store the public key
      localStorage.setItem("stellera_public_key", keypair.publicKey())
      
      // Connect the wallet
      await connect()
      
      toast.success("Wallet imported successfully!")
    } catch (error) {
      console.error("Failed to import wallet:", error)
      toast.error("Invalid secret key")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Stellera</h1>
        <p className="text-muted-foreground">
          Create or import your Stellar wallet to get started
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="space-y-4">
          <Button
            className="w-full"
            onClick={handleCreateWallet}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create New Wallet"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or import existing wallet
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <Input
              id="secret-key"
              type="password"
              placeholder="Enter your secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleImportWallet}
            disabled={isCreating || !secretKey}
          >
            {isCreating ? "Importing..." : "Import Wallet"}
          </Button>
        </div>
      </div>
    </div>
  )
} 