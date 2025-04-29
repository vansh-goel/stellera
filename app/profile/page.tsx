"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { useWallet } from '@/app/providers/wallet-provider'
import { UsernameManager } from '@/app/components/username-manager'
import { Copy, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { isConnected, publicKey, currentAccount } = useWallet()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('username')
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])
  
  const copyToClipboard = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  const formatPublicKey = (key: string) => {
    if (!key) return ''
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`
  }
  
  if (!isConnected || !publicKey) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
            <Button onClick={() => router.push('/')}>Go to Home</Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your profile settings and preferences</p>
      </div>
      
      {/* Account Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your wallet information and public key</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Account Name</p>
                <p className="font-medium">{currentAccount?.name || 'My Stellar Account'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Network</p>
                <p className="font-medium">Stellar Testnet</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Public Key</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm">{publicKey}</code>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => window.open(`https://stellar.expert/explorer/testnet/account/${publicKey}`, '_blank')}
                  title="View on Explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              {copied && <p className="text-green-500 text-xs mt-1">Copied to clipboard!</p>}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for different settings */}
      <Tabs defaultValue="username" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="username">Username</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="username" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Username Settings</h2>
              <p className="text-muted-foreground mb-6">
                Set a username to make it easier for others to send you payments. 
                Instead of sharing your public key, they can simply use your username.
              </p>
              <UsernameManager />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Username Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Easier payments - receive funds using @username instead of a long public key</li>
                  <li>Better recognition - create a memorable identity on the Stellar network</li>
                  <li>Simplified sharing - share your username easily with friends and contacts</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Configure your app preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Preferences settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your security preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Security settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 