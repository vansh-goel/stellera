"use client"

import { Pincode } from "./pincode"
import { usePincode } from "../providers/pincode-provider"
import { useWallet } from "../providers/wallet-provider"
import { NoWallet } from "./no-wallet"

export function PincodeGuard({ children }: { children: React.ReactNode }) {
  const { isVerified, verifyPincode, hasPincode } = usePincode()
  const { hasDefaultWallet } = useWallet()

  // If no wallet exists, show the wallet creation screen
  if (!hasDefaultWallet) {
    return <NoWallet />
  }

  // If wallet exists but no pincode is set, show pincode setup
  if (!hasPincode) {
    return <Pincode onVerify={verifyPincode} isSetup={true} />
  }

  // If pincode exists but not verified, show verification
  if (!isVerified) {
    return <Pincode onVerify={verifyPincode} isSetup={false} />
  }

  // If everything is set up and verified, show the dashboard
  return <>{children}</>
} 