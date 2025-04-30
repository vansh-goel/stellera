"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useWallet } from '@/app/providers/wallet-provider'
import { useToast } from '@/app/hooks/use-toast'
import { Loader2, Check, AlertCircle, Edit2 } from 'lucide-react'

export function DisplayNameManager() {
  const { publicKey } = useWallet()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [inputDisplayName, setInputDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load the user's display name when the component mounts
  useEffect(() => {
    if (publicKey) {
      loadDisplayName()
    }
  }, [publicKey])
  
  const loadDisplayName = async () => {
    if (!publicKey) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/account?walletAddress=${encodeURIComponent(publicKey)}`)
      const data = await response.json()
      
      if (data.user && data.user.displayName) {
        setDisplayName(data.user.displayName)
      }
    } catch (error) {
      console.log('Error loading display name:', error)
      setError('Failed to load display name')
    } finally {
      setIsLoading(false)
    }
  }
  
  const saveDisplayName = async () => {
    if (!publicKey || !inputDisplayName.trim()) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          displayName: inputDisplayName.trim()
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update display name')
      }
      
      setDisplayName(data.displayName)
      setIsEditing(false)
      
      toast({
        title: 'Display name updated',
        description: 'Your display name has been successfully updated',
      })
      
    } catch (err) {
      console.log('Error saving display name:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update display name'
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const startEditing = () => {
    setIsEditing(true)
    setInputDisplayName(displayName || '')
  }
  
  const cancelEditing = () => {
    setIsEditing(false)
    setInputDisplayName('')
  }
  
  // Render different UI based on whether user has a display name
  const renderContent = () => {
    if (isLoading && !isEditing) {
      return (
        <div className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }
    
    if (displayName && !isEditing) {
      return (
        <>
          <CardHeader>
            <CardTitle>Your Display Name</CardTitle>
            <CardDescription>This is how your name appears to others in notifications and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="font-medium text-lg">{displayName}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startEditing}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardContent>
        </>
      )
    }
    
    return (
      <>
        <CardHeader>
          <CardTitle>{displayName ? 'Update Display Name' : 'Set Display Name'}</CardTitle>
          <CardDescription>
            {displayName 
              ? 'Change how your name appears to others.' 
              : 'Set a display name to make your payments more personal.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveDisplayName(); }}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Your name"
                  value={inputDisplayName}
                  onChange={(e) => setInputDisplayName(e.target.value)}
                  disabled={isLoading}
                  minLength={2}
                  maxLength={30}
                  required
                />
                {error && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Your display name will be shown in notifications and payment histories.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {isEditing && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={cancelEditing}
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isLoading || !inputDisplayName.trim()}
              className={isEditing ? "ml-auto" : "w-full"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {displayName ? 'Update Display Name' : 'Set Display Name'}
            </Button>
          </CardFooter>
        </form>
      </>
    )
  }
  
  return (
    <Card className="w-full">
      {renderContent()}
    </Card>
  )
} 