"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { useTheme } from "next-themes"
import { Button } from "@/app/components/ui/button"
import { WalletSwitcher } from "./wallet-switcher"
import { User, LogOut } from "lucide-react"
import { useWallet } from "@/app/providers/wallet-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/app/components/ui/dropdown-menu"

export function Navbar() {
  const { setTheme, theme } = useTheme()
  const { isConnected, publicKey, disconnect, currentAccount } = useWallet()

  const formatPublicKey = (key: string) => {
    if (!key) return ""
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-40 h-16">
      <div className="h-full bg-black rounded-lg border-b-gray-900 border-border/50 shadow-sm">
        <div className="flex h-full items-center justify-end px-4 md:px-8">
          {/* Mobile sidebar toggle - not implemented yet */}
          <div className="md:hidden">
            {/* Mobile menu button would go here */}
          </div>
          
          <div className="flex items-center gap-6">
            {/* Network Status */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Stellar Testnet</span>
            </div>
            
            {/* User Profile & Wallet */}
            {isConnected && publicKey ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 border-gray-700">
                    {currentAccount?.name || 'Account'}: {formatPublicKey(publicKey)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/profile" className="cursor-pointer">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnect}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <WalletSwitcher />
            )}
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="rounded-full h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {/* Notifications - Visual indicator only for now */}
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary"></span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
} 