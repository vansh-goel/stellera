import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import { WalletState } from "./components/wallet-state"
import { WalletProvider } from "./providers/wallet-provider"
import { Toaster } from "./components/toaster"
import { PincodeProvider } from "./providers/pincode-provider"
import { PincodeGuard } from "./components/pincode-guard"
import { Navbar } from "./components/navbar"
import { Particles } from "./components/particles"
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stellera: Modern Stellar Wallet App",
  description: "A modern wallet for the Stellar network with advanced features",
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
          <PincodeProvider>
            <PincodeGuard>
              <Providers>
                <div className="relative min-h-screen flex flex-col">
                  <main className="flex-1 pt-5">
                    <WalletState>
                      <Particles />
                      {children}
                    </WalletState>
                  </main>
                </div>
                <Toaster />
              </Providers>
            </PincodeGuard>
          </PincodeProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
