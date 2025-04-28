"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface PincodeContextType {
  isVerified: boolean
  verifyPincode: () => void
  hasPincode: boolean
}

const PincodeContext = createContext<PincodeContextType | undefined>(undefined)

export function PincodeProvider({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false)
  const [hasPincode, setHasPincode] = useState(false)

  useEffect(() => {
    const pincode = localStorage.getItem("stellera_pincode")
    setHasPincode(!!pincode)
  }, [])

  const verifyPincode = () => {
    setIsVerified(true)
  }

  return (
    <PincodeContext.Provider value={{ isVerified, verifyPincode, hasPincode }}>
      {children}
    </PincodeContext.Provider>
  )
}

export function usePincode() {
  const context = useContext(PincodeContext)
  if (context === undefined) {
    throw new Error("usePincode must be used within a PincodeProvider")
  }
  return context
} 