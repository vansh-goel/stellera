"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useUsername } from '@/app/hooks/use-username'
import { Loader2, Check, X, AlertCircle, Edit2, Trash2 } from 'lucide-react'

export function UsernameManager() {
  const { 
    username, 
    isLoading, 
    error, 
    checkUsername, 
    registerUsername, 
    updateUsername,
    loadUsername,
    deleteUsername 
  } = useUsername()
  
  const [inputUsername, setInputUsername] = useState('')
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Load the user's username when the component mounts
  useEffect(() => {
    loadUsername()
  }, [loadUsername])
  
  // Check if a username is available when the input changes (with debounce)
  useEffect(() => {
    if (!inputUsername || inputUsername.length < 3) {
      setIsAvailable(null)
      return
    }
    
    const timer = setTimeout(async () => {
      if (inputUsername) {
        setIsChecking(true)
        const available = await checkUsername(inputUsername)
        setIsAvailable(available)
        setIsChecking(false)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [inputUsername, checkUsername])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputUsername) return
    
    if (username && isEditing) {
      await updateUsername(inputUsername)
      setIsEditing(false)
    } else {
      await registerUsername(inputUsername)
    }
    
    setInputUsername('')
  }
  
  const handleDeleteUsername = async () => {
    if (confirm('Are you sure you want to delete your username? You will no longer be able to receive payments using it.')) {
      setIsDeleting(true)
      await deleteUsername()
      setIsDeleting(false)
    }
  }
  
  const startEditing = () => {
    setIsEditing(true)
    setInputUsername(username || '')
  }
  
  const cancelEditing = () => {
    setIsEditing(false)
    setInputUsername('')
  }
  
  // Render different UI based on whether user has a username
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }
    
    if (username && !isEditing) {
      return (
        <>
          <CardHeader>
            <CardTitle>Your Username</CardTitle>
            <CardDescription>This is how others can send you payments using your username.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="font-mono text-lg font-semibold">@{username}</div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startEditing}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteUsername}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )
    }
    
    return (
      <>
        <CardHeader>
          <CardTitle>{username ? 'Update Username' : 'Set Username'}</CardTitle>
          <CardDescription>
            {username ? 'Change your username for receiving payments.' : 'Set a username to make receiving payments easier.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-2 flex items-center">
                    <span className="text-muted-foreground">@</span>
                  </div>
                  <Input
                    placeholder="username"
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    className="pl-6"
                    disabled={isLoading}
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                    required
                  />
                  {isChecking && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {isAvailable === true && inputUsername.length >= 3 && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {isAvailable === false && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <X className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {inputUsername.length > 0 && inputUsername.length < 3 && (
                  <p className="text-sm text-muted-foreground">Username must be at least 3 characters</p>
                )}
                {isAvailable === false && (
                  <p className="text-sm text-red-500">This username is already taken</p>
                )}
                {error && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Usernames can only contain letters, numbers, and underscores.
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
              disabled={isLoading || isChecking || isAvailable === false || inputUsername.length < 3}
              className={isEditing ? "ml-auto" : "w-full"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditing ? 'Update Username' : 'Set Username'}
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