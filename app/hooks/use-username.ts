import { useState, useCallback } from 'react'
import { useWallet } from '@/app/providers/wallet-provider'
import { useToast } from '@/app/hooks/use-toast'

interface UseUsernameOptions {
  onSuccess?: (username: string) => void
  onError?: (error: string) => void
}

export function useUsername(options: UseUsernameOptions = {}) {
  const { publicKey } = useWallet()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if a username is available
  const checkUsername = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck) return false
    
    try {
      setIsLoading(true)
      const res = await fetch(`/api/username?username=${encodeURIComponent(usernameToCheck)}`)
      const data = await res.json()
      return data.available
    } catch (err) {
      console.error('Error checking username:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get a username for a publicKey
  const getUsernameForPublicKey = useCallback(async (publicKeyToCheck: string) => {
    if (!publicKeyToCheck) return null
    
    try {
      setIsLoading(true)
      const res = await fetch(`/api/username?publicKey=${encodeURIComponent(publicKeyToCheck)}`)
      const data = await res.json()
      return data.exists ? data.username : null
    } catch (err) {
      console.error('Error getting username for public key:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get a public key for a username
  const getPublicKeyForUsername = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck) return null
    
    // Remove @ if present
    const cleanUsername = usernameToCheck.startsWith('@') 
      ? usernameToCheck.substring(1) 
      : usernameToCheck
    
    try {
      setIsLoading(true)
      const res = await fetch(`/api/username?username=${encodeURIComponent(cleanUsername)}`)
      const data = await res.json()
      return data.available ? null : data.publicKey
    } catch (err) {
      console.error('Error getting public key for username:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Register a new username
  const registerUsername = useCallback(async (newUsername: string) => {
    if (!publicKey) {
      setError('No wallet connected')
      options.onError?.('No wallet connected')
      return
    }
    
    if (!newUsername) {
      setError('Username is required')
      options.onError?.('Username is required')
      return
    }
    
    try {
      setError(null)
      setIsLoading(true)
      
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
          publicKey,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register username')
      }
      
      setUsername(data.username)
      toast({
        title: 'Username registered',
        description: `You can now receive payments at @${data.username}`,
      })
      
      options.onSuccess?.(data.username)
      return data.username
    } catch (err) {
      console.error('Error registering username:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to register username'
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      
      options.onError?.(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, toast, options])
  
  // Update an existing username
  const updateUsername = useCallback(async (newUsername: string) => {
    if (!publicKey) {
      setError('No wallet connected')
      options.onError?.('No wallet connected')
      return
    }
    
    if (!newUsername) {
      setError('New username is required')
      options.onError?.('New username is required')
      return
    }
    
    try {
      setError(null)
      setIsLoading(true)
      
      const res = await fetch('/api/username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newUsername,
          publicKey,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update username')
      }
      
      setUsername(data.username)
      toast({
        title: 'Username updated',
        description: `Your username is now @${data.username}`,
      })
      
      options.onSuccess?.(data.username)
      return data.username
    } catch (err) {
      console.error('Error updating username:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update username'
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      
      options.onError?.(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, toast, options])
  
  // Load the current user's username
  const loadUsername = useCallback(async () => {
    if (!publicKey) {
      setUsername(null)
      return null
    }
    
    try {
      setIsLoading(true)
      setError(null)
      const fetchedUsername = await getUsernameForPublicKey(publicKey)
      setUsername(fetchedUsername)
      return fetchedUsername
    } catch (err) {
      console.error('Error loading username:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load username'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, getUsernameForPublicKey])
  
  // Delete the username
  const deleteUsername = useCallback(async () => {
    if (!publicKey) {
      setError('No wallet connected')
      options.onError?.('No wallet connected')
      return false
    }
    
    try {
      setError(null)
      setIsLoading(true)
      
      const res = await fetch(`/api/username?publicKey=${encodeURIComponent(publicKey)}`, {
        method: 'DELETE',
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete username')
      }
      
      setUsername(null)
      toast({
        title: 'Username removed',
        description: 'Your username has been removed',
      })
      
      return true
    } catch (err) {
      console.error('Error deleting username:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete username'
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      
      options.onError?.(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, toast, options])
  
  // Search for usernames
  const searchUsernames = useCallback(async (query: string) => {
    if (!query || query.length < 2) return []
    
    try {
      const res = await fetch(`/api/username/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search usernames')
      }
      
      return data.results || []
    } catch (err) {
      console.error('Error searching usernames:', err)
      return []
    }
  }, [])

  return {
    username,
    isLoading,
    error,
    checkUsername,
    registerUsername,
    updateUsername,
    loadUsername,
    deleteUsername,
    getUsernameForPublicKey,
    getPublicKeyForUsername,
    searchUsernames,
  }
} 