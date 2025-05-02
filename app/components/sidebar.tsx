"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    title: "Username Pay",
    href: "/username-pay",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
  {
    title: "Splitwise",
    href: "/splitwise",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      </svg>
    ),
  },
  {
    title: "Rewards",
    href: "/rewards",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    title: "NFT Tickets",
    href: "/nft-tickets",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M4 18v-5.5C4 9.03 7.03 6 10.5 6H12" />
        <path d="m14.5 9.5 3-3 3 3" />
        <path d="M14.5 6.5v6" />
        <path d="M4 14h10" />
        <path d="M15 18v.01" />
      </svg>
    ),
  },
  {
    title: "Swap",
    href: "/swap",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="m17 4 3 3-3 3" />
        <path d="M6 7h14" />
        <path d="m7 20-3-3 3-3" />
        <path d="M18 17H4" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col md:flex">
        {/* Sidebar backdrop - more solid background */}
        <div className="absolute inset-0 bg-background/95"></div>
        
        <div className="relative flex h-full flex-col border-r border-white/60 border-border/50">
          {/* App Logo & Name */}
          <div className="flex h-16 items-center px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m6 12 6-6 6 6" />
                  <path d="m6 12 6 6 6-6" />
                </svg>
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Stellera
              </span>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="mt-4 flex-1 space-y-1 px-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-primary/10 ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`mr-3 transition-colors ${isActive ? "text-primary" : ""}`}>
                    {item.icon}
                  </span>
                  {item.title}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"></span>
                  )}
                </Link>
              )
            })}
          </nav>
          
          {/* User Profile */}
          <div className="mt-auto mb-4 px-4">
            <div className="rounded-xl p-4 bg-muted/80 shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full overflow-hidden h-10 w-10 bg-primary/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="overflow-hidden">
                  <div className="truncate text-sm font-medium">G...5ADG</div>
                  <div className="truncate text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Connected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation - visible only on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border/50 bg-background/95 backdrop-blur">
        <nav className="flex w-full justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-2 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`transition-colors ${isActive ? "text-primary" : ""}`}>
                  {/* Make icons bigger for better touch targets on mobile */}
                  <span className="flex h-7 w-7 items-center justify-center">
                    {React.cloneElement(item.icon, { className: "h-5 w-5" })}
                  </span>
                </span>
                {isActive && (
                  <span className="h-1 w-1 rounded-full bg-primary mt-0.5"></span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}