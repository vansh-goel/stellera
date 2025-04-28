"use client"

import { useEffect, useState } from "react"
import { CreateWallet } from "@/app/components/create-wallet"
import { Dashboard } from "@/app/components/dashboard"

export default function Home() {
  const [hasWallet, setHasWallet] = useState(false)

  useEffect(() => {
    const publicKey = localStorage.getItem("stellera_public_key")
    setHasWallet(!!publicKey)
  }, [])

  return (
    <div className="container mx-auto">
      {hasWallet ? <Dashboard /> : <CreateWallet />}
    </div>
  )
}
