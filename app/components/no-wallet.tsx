"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { useWallet } from "@/app/providers/wallet-provider"
import { Wallet, Import } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"

export function NoWallet() {
  const { createAccount, importWallet } = useWallet()
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [secretKey, setSecretKey] = useState("")
  const [accountName, setAccountName] = useState("")

  const handleImport = async () => {
    if (secretKey && accountName) {
      await importWallet(secretKey, accountName)
      setSecretKey("")
      setAccountName("")
      setIsImportOpen(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Stellera</h1>
        <p className="text-xl text-muted-foreground">
          Create or import a wallet to get started
        </p>
      </div>
      
      <div className="flex gap-4">
        <Button
          size="lg"
          className="gap-2"
          onClick={createAccount}
        >
          <Wallet className="h-5 w-5" />
          Create Wallet
        </Button>

        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
            >
              <Import className="h-5 w-5" />
              Import Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Wallet</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="secretKey">Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter your secret key"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter account name"
                />
              </div>
              <Button 
                onClick={handleImport}
                disabled={!secretKey || !accountName}
              >
                Import Wallet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 