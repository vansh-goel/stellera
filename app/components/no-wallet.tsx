"use client"

import { useState } from "react"
import { useWallet } from "../providers/wallet-provider"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Particles } from "./particles"

export function NoWallet() {
  const { createAccount, importWallet } = useWallet()
  const [secretKey, setSecretKey] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState("")

  const handleCreateWallet = async () => {
    try {
      await createAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet")
    }
  }

  const handleImportWallet = async () => {
    try {
      if (!secretKey) {
        setError("Please enter a valid secret key")
        return
      }
      await importWallet(secretKey, "Imported Wallet")
      setSecretKey("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import wallet")
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      {/* Background particles */}
      <Particles />
      
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl"></div>
        <div className="absolute bottom-40 left-20 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-200 mb-2 text-center">
          Welcome to Stellera
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Create or import a wallet to get started
        </p>

        <div className="space-y-6">
          <Button
            onClick={handleCreateWallet}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Create New Wallet
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-gray-400">or</span>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsImporting(!isImporting)}
            >
              {isImporting ? "Cancel Import" : "Import Existing Wallet"}
            </Button>

            {isImporting && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="secretKey" className="text-gray-400">
                    Secret Key
                  </Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter your secret key"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button
                  onClick={handleImportWallet}
                  className="w-full"
                  disabled={!secretKey}
                >
                  Import Wallet
                </Button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
} 