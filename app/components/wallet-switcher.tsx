"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { useWallet } from "@/app/providers/wallet-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu"
import { ChevronDown, Wallet, Plus, LogOut } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"

interface WalletAccount {
  publicKey: string
  secretKey: string
  name: string
}

export function WalletSwitcher() {
  const { currentAccount, accounts, connect, disconnect, importWallet, isConnected } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [secretKey, setSecretKey] = useState("")
  const [accountName, setAccountName] = useState("")

  const handleSwitchAccount = async (account: WalletAccount) => {
    await connect(account)
    setIsOpen(false)
  }

  const handleImportWallet = async () => {
    if (secretKey && accountName) {
      await importWallet(secretKey, accountName)
      setSecretKey("")
      setAccountName("")
      setIsImportOpen(false)
    }
  }

  const formatPublicKey = (key: string) => {
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {isConnected && currentAccount ? currentAccount.name : "No Wallet"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.publicKey}
              onClick={() => handleSwitchAccount(account)}
              className={currentAccount?.publicKey === account.publicKey ? "bg-accent" : ""}
            >
              <div className="flex flex-col">
                <span>{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPublicKey(account.publicKey)}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="mr-2 h-4 w-4" />
                Import Wallet
              </DropdownMenuItem>
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
                  onClick={handleImportWallet}
                  disabled={!secretKey || !accountName}
                >
                  Import Wallet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
} 