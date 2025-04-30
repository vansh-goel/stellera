"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList
} from '@/app/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/app/components/ui/popover'
import { Check, ChevronsUpDown, X, PlusCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'

type User = {
  _id: string
  username: string
  walletAddress: string
  displayName?: string
}

interface UserSearchProps {
  onUserSelect: (user: User) => void
  selectedUsers: User[]
  onUserRemove: (userId: string) => void
}

export default function UserSearch({ 
  onUserSelect, 
  selectedUsers, 
  onUserRemove 
}: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [isValidAddress, setIsValidAddress] = useState(false)

  // Check if input is a valid Stellar address
  const checkIfValidAddress = (input: string) => {
    // Simple Stellar address validation - checks if it starts with 'G' and is 56 characters
    return input.startsWith('G') && input.length === 56;
  }

  // Handle manual address input
  const handleAddressInput = async () => {
    if (!inputValue) return;
    
    const trimmedInput = inputValue.trim();
    setLoading(true);
    
    try {
      // Check if it's a Stellar address
      if (checkIfValidAddress(trimmedInput)) {
        // First check if there's a user account for this wallet address
        const userResponse = await fetch(`/api/users/account?walletAddress=${encodeURIComponent(trimmedInput)}`);
        const userData = await userResponse.json();
        
        if (userData.user) {
          // Use the existing user data
          onUserSelect(userData.user);
        } else {
          // Create a temporary user object for the wallet address
          const newUser: User = {
            _id: trimmedInput,
            username: `user_${trimmedInput.substring(0, 6)}`,
            walletAddress: trimmedInput,
            displayName: `User ${trimmedInput.substring(0, 6)}...${trimmedInput.substring(trimmedInput.length - 4)}`
          };
          onUserSelect(newUser);
        }
        
        setInputValue('');
        setIsValidAddress(false);
        return;
      }
      
      // Check if it's a username with @ prefix
      if (trimmedInput.startsWith('@') && trimmedInput.length > 1) {
        const username = trimmedInput.substring(1); // Remove @ prefix
        await searchUserByUsername(username);
        return;
      }
      
      // Regular search if at least 2 characters
      if (trimmedInput.length >= 2) {
        await searchUsers(trimmedInput);
        setOpen(true); // Open the dropdown to show results
      }
    } catch (error) {
      console.log('Error processing input:', error);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search for usernames
  useEffect(() => {
    if (!searchQuery) {
      setUsers([]);
      setIsValidAddress(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (checkIfValidAddress(searchQuery)) {
        setIsValidAddress(true);
        return;
      }
      
      setIsValidAddress(false);
      
      if (searchQuery.length >= 2) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Check input value for valid address
  useEffect(() => {
    if (inputValue) {
      setIsValidAddress(checkIfValidAddress(inputValue.trim()));
    } else {
      setIsValidAddress(false);
    }
  }, [inputValue]);

  // Search for users by username
  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.users) {
        // Filter out already selected users
        const filteredUsers = data.users.filter(
          (user: User) => !selectedUsers.some(selected => selected._id === user._id)
        );
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.log('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }

  // Search for a specific username
  const searchUserByUsername = async (username: string) => {
    setLoading(true);
    try {
      // Using the username API to get the wallet address
      const response = await fetch(`/api/username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (!data.available && data.publicKey) {
        // User exists, get additional details
        const userResponse = await fetch(`/api/users/account?walletAddress=${encodeURIComponent(data.publicKey)}`);
        const userData = await userResponse.json();
        
        if (userData.user) {
          // Check if user is already in the selected list
          if (!selectedUsers.some(selected => selected._id === userData.user._id)) {
            onUserSelect(userData.user);
          }
        } else {
          // Create a basic user object if full details aren't available
          const newUser: User = {
            _id: data.publicKey,
            username: username,
            walletAddress: data.publicKey,
            displayName: `@${username}`
          };
          onUserSelect(newUser);
        }
        
        setInputValue('');
      } else {
        // Username not found - show error or notification
        console.log('Username not found');
        // You could show a temporary message here
      }
    } catch (error) {
      console.log('Error searching username:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (user: User) => {
    onUserSelect(user);
    setOpen(false);
    setSearchQuery('');
    setInputValue('');
    setUsers([]);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddressInput();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter @username or wallet address"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button 
          onClick={handleAddressInput}
          disabled={loading}
          className="whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4 mr-2" />
          )}
          Add User
        </Button>
      </div>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedUsers.map(user => (
            <Badge key={user._id} variant="secondary" className="pl-2">
              {user.displayName || (user.username.startsWith('@') ? user.username : `@${user.username}`)}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={() => onUserRemove(user._id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
} 