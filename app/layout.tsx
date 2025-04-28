import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import { Particles } from "./components/particles"
import { WalletState } from "./components/wallet-state"
import { WalletProvider } from "./providers/wallet-provider"
import { Toaster } from "./components/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stellera - Web3 Finance Made Simple",
  description: "Stellera is a multi-chain web3 finance platform for payments, swaps, and more.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <WalletProvider>
          <Providers>
            <div className="relative min-h-screen bg-background">
              {/* Background particles */}
              <Particles />
              
              {/* Background gradient effects - reduced opacity */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>
                <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl"></div>
                <div className="absolute bottom-40 left-20 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl"></div>
              </div>
              
              <WalletState>
                {children}
              </WalletState>
            </div>
            <Toaster />
          </Providers>
        </WalletProvider>
      </body>
    </html>
  )
}
