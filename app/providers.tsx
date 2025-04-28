"use client"

import { ThemeProvider } from "./components/theme-provider"
import { WalletProvider } from "./providers/wallet-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <WalletProvider>
        {children}
      </WalletProvider>
    </ThemeProvider>
  )
} 