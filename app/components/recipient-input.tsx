"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { Loader2, AtSign, CheckCircle2, XCircle, User, Hash } from 'lucide-react'
import { useUsername } from '@/app/hooks/use-username'
import { debounce } from 'lodash'

interface RecipientInputProps {
  value: string
  onChange: (value: string, resolvedAddress?: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
}

export function RecipientInput({
  value,
  onChange,
  placeholder = "Public key or username",
  className = "",
  disabled = false,
  error
}: RecipientInputProps) {
  const { getPublicKeyForUsername } = useUsername()
  const [isLoading, setIsLoading] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [inputType, setInputType] = useState<'username' | 'address'>('address')
  const [displayValue, setDisplayValue] = useState('')
  const initializedRef = useRef(false)
  
  // Initialize once and handle value updates
  useEffect(() => {
    // First-time initialization
    if (!initializedRef.current) {
      if (value.startsWith('@')) {
        setDisplayValue(value.substring(1))
        setInputType('username')
      } else {
        setDisplayValue(value)
        setInputType('address')
      }
      initializedRef.current = true;
      return;
    }
    
    // Handle external value updates
    if (value.startsWith('@') && inputType === 'username') {
      setDisplayValue(value.substring(1))
    } else if (!value.startsWith('@') && inputType === 'address') {
      setDisplayValue(value)
    } else if (value.startsWith('@') && inputType === 'address') {
      setInputType('username')
      setDisplayValue(value.substring(1))
    } else if (!value.startsWith('@') && inputType === 'username') {
      setInputType('address')
      setDisplayValue(value)
    }
  }, [value, inputType]);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // If we're already in username mode
    if (inputType === 'username') {
      // If user has cleared all content, switch back to address mode
      if (newValue === '') {
        setInputType('address')
        setDisplayValue('')
        onChange('', undefined)
        return
      }
      
      setDisplayValue(newValue)
      onChange(`@${newValue}`, resolvedAddress || undefined)
    } else {
      // Check if user is switching to username mode by typing @
      if (newValue.startsWith('@')) {
        setInputType('username')
        setDisplayValue(newValue.substring(1))
        onChange(`@${newValue.substring(1)}`, resolvedAddress || undefined)
      } else {
        setDisplayValue(newValue)
        onChange(newValue, resolvedAddress || undefined)
      }
    }
  }
  
  // Toggle between username and address mode
  const toggleInputType = () => {
    if (inputType === 'address') {
      setInputType('username')
      // Keep the same display value but prefix with @ in the actual value
      onChange(`@${displayValue}`, undefined)
    } else {
      setInputType('address')
      // If we have a username, convert back to plain text
      onChange(displayValue, undefined)
    }
  }
  
  // Debounced function to resolve username to public key
  const resolveUsername = useCallback(
    debounce(async (username: string) => {
      if (!username) {
        setResolvedAddress(null)
        return
      }
      
      try {
        setIsLoading(true)
        const publicKey = await getPublicKeyForUsername('@' + username)
        setResolvedAddress(publicKey)
        
        // Call onChange with both the username and resolved address
        if (publicKey) {
          onChange(`@${username}`, publicKey)
        }
      } catch (error) {
        console.log('Error resolving username:', error)
        setResolvedAddress(null)
      } finally {
        setIsLoading(false)
      }
    }, 500),
    [getPublicKeyForUsername, onChange]
  )
  
  // Resolve username when displayValue changes and we're in username mode
  useEffect(() => {
    if (inputType === 'username' && displayValue) {
      resolveUsername(displayValue)
    } else {
      setResolvedAddress(null)
    }
    
    return () => {
      resolveUsername.cancel()
    }
  }, [displayValue, inputType, resolveUsername])
  
  // Provide visual feedback based on username resolution status
  const renderIndicator = () => {
    if (inputType === 'username') {
      if (isLoading) {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      } else if (resolvedAddress) {
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      } else if (displayValue.length > 0) {
        return <XCircle className="h-4 w-4 text-red-500" />
      }
      return <AtSign className="h-4 w-4 text-muted-foreground" />
    }
    
    return <Hash className="h-4 w-4 text-muted-foreground" />
  }
  
  // Format long addresses for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 20) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };
  
  return (
    <div className="space-y-2 w-full">
      <div className="relative w-full flex items-center">
        <Button 
          type="button"
          variant="ghost" 
          size="icon" 
          className="absolute left-0 top-0 h-full px-2 flex items-center justify-center rounded-r-none z-10"
          onClick={toggleInputType}
          tabIndex={-1}
        >
          {inputType === 'username' ? (
            <AtSign className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        
        <Input
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`pl-10 pr-10 w-full ${className}`}
          disabled={disabled}
        />
        
        <div className="absolute inset-y-0 right-3 flex items-center z-10">
          {renderIndicator()}
        </div>
      </div>
      
      {inputType === 'username' && resolvedAddress && (
        <p className="text-xs text-muted-foreground break-all">
          <span className="mr-1 inline-block">Resolves to:</span>
          <span className="font-mono">
            {typeof window !== 'undefined' && window.innerWidth < 640 
              ? formatAddress(resolvedAddress) 
              : resolvedAddress}
          </span>
        </p>
      )}
      
      {inputType === 'username' && !resolvedAddress && displayValue.length > 0 && !isLoading && (
        <p className="text-xs text-red-500">
          Username not found
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
} 