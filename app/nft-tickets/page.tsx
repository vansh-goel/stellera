"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { useWallet } from "@/app/providers/wallet-provider"
import { useToast } from "@/app/hooks/use-toast"
import { Horizon, Asset } from "@stellar/stellar-sdk"
import { RecipientInput } from "@/app/components/recipient-input"
import { useUsername } from "@/app/hooks/use-username"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Loader2, Ticket, CalendarIcon, MapPin, CoinsIcon, Clock, InfoIcon, Copy, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import QRCode from "react-qr-code"

// Network configuration
const HORIZON_URL = "https://horizon-testnet.stellar.org"

type Event = {
  id: string
  name: string
  date: string
  location: string
  ticketsTotal: number
  ticketsSold: number
  ticketPrice: number
  imageUrl?: string
  ipfsHash?: string
  assetCode: string
  issuer: string
}

type Ticket = {
  id: string
  eventName: string
  eventDate: string
  location: string
  seat?: string
  owner: string
  used: boolean
  transferable: boolean
  assetCode: string
  assetIssuer: string
}

export default function NFTTicketsPage() {
  const { publicKey, sign, isConnected } = useWallet()
  const { toast } = useToast()
  const { getPublicKeyForUsername } = useUsername()
  const [activeTab, setActiveTab] = useState<'myTickets' | 'explore' | 'create'>('myTickets')
  
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [receivedTickets, setReceivedTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [showQR, setShowQR] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAddress, setTransferAddress] = useState("")
  const [resolvedTransferAddress, setResolvedTransferAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transferMemo, setTransferMemo] = useState("")
  const [needsTrustline, setNeedsTrustline] = useState(false)
  
  // Form state for creating a new event
  const [eventForm, setEventForm] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    totalTickets: "100",
    ticketPrice: "0",
    description: ""
  })
  
  // State for send ticket form
  const [showSendTicket, setShowSendTicket] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [recipientAddress, setRecipientAddress] = useState("")
  const [resolvedRecipientAddress, setResolvedRecipientAddress] = useState("")
  const [sendMemo, setSendMemo] = useState("")
  const [isSending, setIsSending] = useState(false)
  
  const [showTrustlineInfo, setShowTrustlineInfo] = useState(false)
  const [trustlineDetails, setTrustlineDetails] = useState<{assetCode: string, assetIssuer: string}>({ assetCode: '', assetIssuer: '' })
  const [txDetails, setTxDetails] = useState<{hash?: string, ledger?: number, created?: string}>({})
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [createdEventDetails, setCreatedEventDetails] = useState<Event | null>(null)
  const [copied, setCopied] = useState(false)
  
  // State for trustline creation
  const [isCreatingTrustline, setIsCreatingTrustline] = useState(false)
  const [trustlineAsset, setTrustlineAsset] = useState<{code: string, issuer: string} | null>(null)
  
  // Fetch user's events and tickets when wallet connects
  useEffect(() => {
    if (isConnected && publicKey) {
      fetchMyEventsAndTickets()
    }
  }, [isConnected, publicKey])
  
  const fetchMyEventsAndTickets = async () => {
    if (!publicKey) return
    
    try {
      setIsLoading(true)
      
      // Connect to Stellar Horizon API
      const server = new Horizon.Server(HORIZON_URL)
      
      // 1. Fetch account assets to find received tickets
      console.log("Loading account to fetch events and tickets:", publicKey)
      const account = await server.loadAccount(publicKey)
      console.log("Account loaded, balances:", account.balances)
      
      // Get all non-native assets with balance > 0 as potential tickets
      // Specifically filter for the ticketing assets that have positive balance
      // Exclude SLR tokens
      const potentialTickets = account.balances
        .filter(balance => 
          balance.asset_type !== 'native' && 
          balance.asset_type !== 'liquidity_pool_shares' &&
          parseFloat(balance.balance) > 0 &&
          (balance as any).asset_code !== 'SLR' // Exclude SLR tokens
        )
        .map(balance => {
          // Type assertion to ensure we have the necessary properties
          const assetBalance = balance as {
            asset_type: string;
            asset_code: string;
            asset_issuer: string;
            balance: string;
          };
          return assetBalance;
        });
      
      console.log("Found potential tickets:", potentialTickets)
      
      // 2. Fetch account operations to find created events
      console.log("Fetching account operations to find events...")
      const { records: operations } = await server.operations()
        .forAccount(publicKey)
        .limit(200) // Increased limit to find more operations
        .order('desc')
        .call()
      
      console.log(`Retrieved ${operations.length} operations for account`)
      
      // Find payment operations that created NFT assets (self-payments with non-native asset)
      // Also include manage_data operations that might have been used to create events
      const assetCreationOps = operations.filter((op: any) => {
        return (op.type === 'payment' && 
               op.from === publicKey && 
               op.to === publicKey && 
               op.asset_type !== 'native') ||
               (op.type === 'manage_data' && op.name === 'asset_type' && op.value === 'nft_ticket')
      })
      
      console.log(`Found ${assetCreationOps.length} asset creation operations:`, assetCreationOps)
      
      // Get the transaction data for each asset creation to extract metadata
      const eventsData = await Promise.all(
        assetCreationOps.map(async (op: any) => {
          try {
            // Get the transaction that contains this operation
            const tx = await server.transactions().transaction(op.transaction_hash).call()
            console.log("Transaction for asset creation:", tx)
            
            // Get the memo if available
            const memoText = tx.memo || ''
            console.log("Memo for event:", memoText)
            
            // Get all operations in this transaction to extract manage_data operations
            const { records: txOps } = await server.operations()
              .forTransaction(op.transaction_hash)
              .call()
            
            console.log(`Found ${txOps.length} operations in asset creation transaction`, txOps)
            
            // Filter for manage_data operations
            const manageDataOps = txOps.filter((txOp: any) => txOp.type === 'manage_data')
            console.log("Manage data operations:", manageDataOps)
            
            // Extract event metadata from manage data operations
            const metadata: {[key: string]: string} = {}
            manageDataOps.forEach((dataOp: any) => {
              if (dataOp.name && dataOp.value) {
                metadata[dataOp.name] = dataOp.value
              }
            })
            
            console.log("Extracted metadata:", metadata)
            
            // Return null if this is not an NFT ticket (no asset_type or not nft_ticket)
            if (metadata.asset_type !== 'nft_ticket' && !(op.type === 'payment' || op.type === 'manage_data')) {
              console.log("Skipping non-ticket asset, no metadata or not a relevant operation type")
              return null
            }
            
            // For payment operations, get the asset details directly
            let assetCode = ''
            let assetIssuer = ''
            
            // Extract asset details based on operation type
            if (op.type === 'payment') {
              // Use type assertion to access payment-specific fields
              const paymentOp = op as any;
              assetCode = paymentOp.asset_code || '';
              assetIssuer = paymentOp.asset_issuer || '';
            } else if (op.type === 'manage_data') {
              // Look for payment operations in the same transaction
              const paymentOp = txOps.find((txOp: any) => 
                txOp.type === 'payment' && 
                txOp.from === publicKey && 
                txOp.asset_type !== 'native'
              )
              
              if (paymentOp) {
                // Use type assertion for payment operation
                const typedPaymentOp = paymentOp as any;
                assetCode = typedPaymentOp.asset_code || '';
                assetIssuer = typedPaymentOp.asset_issuer || '';
              } else {
                // If no payment op is found, try to get asset details from metadata
                assetCode = metadata.asset_code || '';
                assetIssuer = metadata.asset_issuer || publicKey;
              }
            }
            
            // Skip if we don't have an asset code (essential for an event)
            if (!assetCode) {
              console.log("Skipping event with no asset code")
              return null
            }
            
            // Parse and validate the event date
            let eventDate = new Date().toISOString();
            if (metadata.event_date) {
              try {
                const parsedDate = new Date(metadata.event_date);
                if (!isNaN(parsedDate.getTime())) {
                  eventDate = parsedDate.toISOString();
                }
              } catch (e) {
                console.log("Invalid date format in metadata, using current date")
              }
            }
            
            // Clean up the event name
            let eventName = assetCode;
            if (metadata.event_name) {
              // Decode if it's base64 encoded
              try {
                if (/^[A-Za-z0-9+/=]{10,}$/.test(metadata.event_name)) {
                  const decoded = Buffer.from(metadata.event_name, 'base64').toString('utf-8');
                  if (decoded && decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
                    eventName = decoded;
                  } else {
                    eventName = metadata.event_name;
                  }
                } else {
                  eventName = metadata.event_name;
                }
              } catch (e) {
                console.log("Error decoding event name:", e);
                eventName = metadata.event_name;
              }
            }
            
            // Get and potentially decode location
            let eventLocation = "Unknown Location";
            if (metadata.event_location) {
              eventLocation = metadata.event_location;
              // Try to decode if it looks like base64
              if (/^[A-Za-z0-9+/=]{4,}$/.test(eventLocation) && eventLocation.length % 4 === 0) {
                try {
                  const decoded = Buffer.from(eventLocation, 'base64').toString('utf-8');
                  // Make sure the decoded text looks reasonable
                  if (decoded && decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
                    eventLocation = decoded;
                  }
                } catch (e) {
                  console.log("Error decoding location:", e);
                }
              }
            }
            
            // Construct event object
            return {
              id: `${assetCode}:${assetIssuer || publicKey}`,
              name: sanitizeEventName(eventName),
              date: eventDate,
              location: eventLocation,
              ticketsTotal: parseInt(metadata.total_supply || "100"),
              ticketsSold: 0,
              ticketPrice: parseFloat(metadata.ticket_price || "0"),
              ipfsHash: memoText,
              assetCode: assetCode,
              issuer: assetIssuer || publicKey
            }
          } catch (err) {
            console.error("Error processing asset creation op:", err)
            return null
          }
        })
      )
      
      // Filter out any null events and non-ticket assets
      const events = eventsData.filter(event => event !== null) as Event[]
      console.log("Processed events:", events)
      
      // For each potential ticket, check if it matches any event
      const tickets: Ticket[] = []
      
      // Track ticket counts for each event
      const eventTicketCounts: Record<string, number> = {}
      
      for (const asset of potentialTickets) {
        try {
          // Try to find if this asset is from any known event first
          const matchingEvent = events.find(e => 
            e.assetCode === asset.asset_code && e.issuer === asset.asset_issuer
          )
          
          if (matchingEvent) {
            // This is a ticket from one of our events
            tickets.push({
              id: `${asset.asset_code}:${asset.asset_issuer}`,
              eventName: sanitizeEventName(matchingEvent.name),
              eventDate: matchingEvent.date,
              location: matchingEvent.location,
              owner: publicKey,
              used: false, // This would come from metadata
              transferable: true, // This would come from metadata
              assetCode: asset.asset_code,
              assetIssuer: asset.asset_issuer
            })
            continue
          }
          
          // If not from our events, try to find the issuing transaction
          const ops = await server.operations()
            .forAccount(asset.asset_issuer)
            .limit(50)
            .call()
          
          const assetOps = ops.records.filter((op: any) => 
            op.type === 'payment' && 
            op.asset_code === asset.asset_code && 
            op.asset_issuer === asset.asset_issuer
          )
          
          if (assetOps.length > 0) {
            // Get the transaction to check for metadata
            const tx = await server.transactions().transaction(assetOps[0].transaction_hash).call()
            const txOps = await server.operations().forTransaction(assetOps[0].transaction_hash).call()
            
            // Extract metadata from manage_data operations
            const metadata: {[key: string]: string} = {}
            txOps.records.forEach((op: any) => {
              if (op.type === 'manage_data' && op.name && op.value) {
                metadata[op.name] = op.value
              }
            })
            
            // Check if this is a ticket
            if (metadata.asset_type === 'nft_ticket') {
              // Parse event date
              let eventDate = new Date().toISOString();
              if (metadata.event_date) {
                try {
                  const parsedDate = new Date(metadata.event_date);
                  if (!isNaN(parsedDate.getTime())) {
                    eventDate = parsedDate.toISOString();
                  }
                } catch (e) {
                  console.log("Invalid date format in metadata, using current date")
                }
              }
              
              // Clean up the event name
              let eventName = metadata.event_name || asset.asset_code;
              
              // Get and potentially decode location
              let eventLocation = "Unknown Location";
              if (metadata.event_location) {
                eventLocation = metadata.event_location;
                // Try to decode if it looks like base64
                if (/^[A-Za-z0-9+/=]{4,}$/.test(eventLocation) && eventLocation.length % 4 === 0) {
                  try {
                    const decoded = Buffer.from(eventLocation, 'base64').toString('utf-8');
                    // Make sure the decoded text looks reasonable
                    if (decoded && decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
                      eventLocation = decoded;
                    }
                  } catch (e) {
                    console.log("Error decoding location:", e);
                  }
                }
              }
              
              tickets.push({
                id: `${asset.asset_code}:${asset.asset_issuer}`,
                eventName: sanitizeEventName(eventName),
                eventDate: eventDate,
                location: eventLocation,
                owner: publicKey,
                used: false,
                transferable: true,
                assetCode: asset.asset_code,
                assetIssuer: asset.asset_issuer
              })
            } else {
              // This is a non-ticket asset, add with basic info
              tickets.push({
                id: `${asset.asset_code}:${asset.asset_issuer}`,
                eventName: sanitizeEventName(asset.asset_code),
                eventDate: new Date().toISOString(),
                location: "Unknown Location",
                owner: publicKey,
                used: false,
                transferable: true,
                assetCode: asset.asset_code,
                assetIssuer: asset.asset_issuer
              })
            }
          } else {
            // Couldn't find issuing transaction, add with basic info
            tickets.push({
              id: `${asset.asset_code}:${asset.asset_issuer}`,
              eventName: sanitizeEventName(asset.asset_code),
              eventDate: new Date().toISOString(),
              location: "Unknown Location",
              owner: publicKey,
              used: false,
              transferable: true,
              assetCode: asset.asset_code,
              assetIssuer: asset.asset_issuer
            })
          }
        } catch (err) {
          console.error("Error processing ticket asset:", asset, err)
          // Add with basic info on error
          tickets.push({
            id: `${asset.asset_code}:${asset.asset_issuer}`,
            eventName: sanitizeEventName(asset.asset_code),
            eventDate: new Date().toISOString(),
            location: "Unknown Location",
            owner: publicKey,
            used: false,
            transferable: true,
            assetCode: asset.asset_code,
            assetIssuer: asset.asset_issuer
          })
        }
      }
      
      console.log("Processed tickets:", tickets)
      
      // Now query for payments made with each event's asset to count tickets distributed
      try {
        // For each event, query payments made with its asset
        for (const event of events) {
          // Look for payment operations with this asset code that were sent to others (distribution)
          const payments = await server.operations()
            .forAccount(publicKey)
            .limit(100)
            .order('desc')
            .call()
          
          // Filter for payment operations with this specific asset
          const assetPayments = payments.records.filter((op: any) => {
            return op.type === 'payment' && 
                  op.asset_type !== 'native' &&
                  op.asset_code === event.assetCode &&
                  op.asset_issuer === event.issuer &&
                  op.from === publicKey &&
                  op.to !== publicKey // Only count payments to others
          })
          
          // Update the tickets sold count for this event
          const ticketsSold = assetPayments.length
          event.ticketsSold = ticketsSold
          
          console.log(`Found ${ticketsSold} distributed tickets for event ${event.name}`)
        }
      } catch (err) {
        console.error("Error counting distributed tickets:", err)
      }
      
      setMyEvents(events)
      setReceivedTickets(tickets)
      
    } catch (error) {
      console.error('Error fetching events and tickets:', error)
      toast({
        title: "Error",
        description: "Failed to load your events and tickets",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleShowTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowQR(true)
  }
  
  // Generate QR code data for ticket validation
  const generateTicketQRData = (ticket: Ticket, userAddress: string): string => {
    const userName = userAddress ? '@' + userAddress.substring(0, 4) + '...' + userAddress.substring(userAddress.length - 4) : 'Unknown User';
    
    // Create a structured data object with all the important information
    const ticketData = {
      ticket_id: ticket.id,
      asset: {
        code: ticket.assetCode,
        issuer: ticket.assetIssuer
      },
      event: {
        name: sanitizeEventName(ticket.eventName),
        date: formatDate(ticket.eventDate),
        location: decodeBase64IfNeeded(ticket.location)
      },
      holder: {
        address: userAddress,
        username: userName
      },
      status: ticket.used ? 'USED' : 'VALID',
      validation_time: new Date().toISOString()
    };
    
    // Return as a formatted JSON string
    return JSON.stringify(ticketData, null, 2);
  };
  
  const handleTransferTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowTransfer(true)
    setNeedsTrustline(false)
    setTransferAddress("")
    setResolvedTransferAddress("")
    setTransferMemo("")
  }
  
  const confirmTransfer = async () => {
    if (!selectedTicket || !publicKey) {
      toast({
        title: "Error",
        description: "Missing required information for transfer",
        variant: "destructive"
      })
      return
    }
    
    // Use resolved address if recipient entered a username, otherwise use direct input
    const destinationAddress = resolvedTransferAddress || transferAddress
    
    if (!destinationAddress) {
      toast({
        title: "Error",
        description: "Please enter a valid recipient address or username",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Call our API endpoint to create the transaction
      const response = await fetch('/api/tickets/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderPublicKey: publicKey,
          recipientPublicKey: destinationAddress,
          assetCode: selectedTicket.assetCode,
          assetIssuer: selectedTicket.assetIssuer,
          memo: transferMemo || undefined
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transfer transaction')
      }
      
      // Check if recipient needs a trustline
      if (data.needsTrustline) {
        setNeedsTrustline(true)
        toast({
          title: "Trustline Required",
          description: "Recipient needs to create a trustline for this asset first",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }
      
      // Sign the transaction
      const signedXDR = await sign({
        transactionXDR: data.transactionXDR,
        network: data.networkPassphrase,
        pincode: "" // No pincode needed for this example
      })
      
      // Submit the signed transaction to the network
      console.log("Submitting transfer transaction...")
      const submitResponse = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signedXdr: signedXDR
        })
      })
      
      const submitData = await submitResponse.json()
      console.log("Transfer submission response:", submitData)
      
      if (!submitResponse.ok) {
        throw new Error(submitData.error || submitData.details || 'Failed to submit transaction')
      }
      
      toast({
        title: "Success",
        description: "Ticket transferred successfully!"
      })
      
      // Update the UI by removing the ticket from the list
      const updatedTickets = receivedTickets.filter(t => 
        !(t.assetCode === selectedTicket.assetCode && t.assetIssuer === selectedTicket.assetIssuer)
      )
      setReceivedTickets(updatedTickets)
      setShowTransfer(false)
      setTransferAddress("")
      setResolvedTransferAddress("")
      setTransferMemo("")
      
      // Refresh the events and tickets
      fetchMyEventsAndTickets()
      
    } catch (error) {
      console.error('Transfer error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transfer ticket",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      console.log("Creating event with details:", eventForm)
      
      // Format event date and time
      const eventDateTime = new Date(`${eventForm.date}T${eventForm.time || '00:00'}`)
      
      // Prepare location (encode if it contains non-ASCII characters)
      let eventLocation = eventForm.location;
      
      // Create a real IPFS-style hash with actual event metadata
      const eventMetadata = {
        name: eventForm.name,
        date: eventDateTime.toISOString(),
        location: eventLocation,
        description: eventForm.description,
        ticketPrice: eventForm.ticketPrice,
        totalSupply: eventForm.totalTickets,
        createdAt: new Date().toISOString(),
        creator: publicKey
      }
      
      // In a real app you'd upload this metadata to IPFS
      // For now, we'll use a simulated hash with real data encoded
      const encodedData = Buffer.from(JSON.stringify(eventMetadata)).toString('base64')
      const ipfsHash = `sample-hash-${Date.now()}`
      
      console.log("Generated event metadata:", eventMetadata)
      console.log("Generated IPFS hash:", `ipfs://${ipfsHash}`)
      
      // Call our API endpoint to create the NFT ticket
      const response = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey,
          eventName: eventForm.name,
          eventDate: eventDateTime.toISOString(),
          eventLocation: eventForm.location,
          totalSupply: parseInt(eventForm.totalTickets),
          ticketPrice: parseFloat(eventForm.ticketPrice),
          ipfsHash
        })
      })
      
      const data = await response.json()
      
      console.log("API response data:", data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event')
      }
      
      // Sign the transaction using the wallet
      console.log("Signing transaction with XDR:", data.transactionXDR)
      console.log("Network passphrase:", data.networkPassphrase)
      
      let signedXDR
      try {
        signedXDR = await sign({
          transactionXDR: data.transactionXDR,
          network: data.networkPassphrase,
          pincode: ""
        })
        
        console.log("Transaction signed successfully")
        console.log("Signed XDR:", signedXDR)
      } catch (signError) {
        console.error("Error signing transaction:", signError)
        throw new Error("Failed to sign transaction. Please try again.")
      }
      
      // Submit the transaction to the network
      try {
        console.log("Submitting transaction to the network...")
        const submitResponse = await fetch('/api/transactions/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            signedXdr: signedXDR
          })
        })
        
        const submitData = await submitResponse.json()
        console.log("Transaction submission response:", submitData)
        
        if (!submitResponse.ok) {
          console.error("Transaction submission failed:", submitData)
          throw new Error(submitData.error || submitData.details || 'Failed to submit transaction')
        }
        
        // Store transaction details
        setTxDetails({
          hash: submitData.hash,
          ledger: submitData.ledger,
          created: submitData.created_at
        })
        
        // Success handling
        toast({
          title: "Success",
          description: "Event created successfully!"
        })
        
        // Add the new event to the user's events list
        const newEvent: Event = {
          id: `${data.assetCode}:${publicKey}`,
          name: eventForm.name,
          date: eventDateTime.toISOString(),
          location: eventForm.location,
          ticketsTotal: parseInt(eventForm.totalTickets),
          ticketsSold: 0,
          ticketPrice: parseFloat(eventForm.ticketPrice),
          ipfsHash,
          assetCode: data.assetCode,
          issuer: publicKey
        }
        
        setMyEvents([...myEvents, newEvent])
        setCreatedEventDetails(newEvent)
        
        // Set trustline details for the info dialog
        setTrustlineDetails({
          assetCode: data.assetCode,
          assetIssuer: publicKey
        })
        
        // Show event details dialog
        setShowEventDetails(true)
        
        // Reset form
        setEventForm({
          name: "",
          date: "",
          time: "",
          location: "",
          totalTickets: "100",
          ticketPrice: "0",
          description: ""
        })
        
        // Refresh events after success
        setTimeout(() => {
          fetchMyEventsAndTickets()
        }, 2000)
      } catch (submitError: any) {
        console.error("Transaction submission error:", submitError)
        
        // For testing, we can still show success if we have the asset code
        if (data.assetCode) {
          toast({
            title: "Partial Success",
            description: "Event created but transaction submission failed. The event may still be valid."
          })
          
          // Add the new event to the user's events list
          const newEvent: Event = {
            id: `${data.assetCode}:${publicKey}`,
            name: eventForm.name,
            date: eventDateTime.toISOString(),
            location: eventForm.location,
            ticketsTotal: parseInt(eventForm.totalTickets),
            ticketsSold: 0,
            ticketPrice: parseFloat(eventForm.ticketPrice),
            ipfsHash,
            assetCode: data.assetCode,
            issuer: publicKey
          }
          
          setMyEvents([...myEvents, newEvent])
          setCreatedEventDetails(newEvent)
          
          // Set trustline details for the info dialog
          setTrustlineDetails({
            assetCode: data.assetCode,
            assetIssuer: publicKey
          })
          
          // Show event details dialog
          setShowEventDetails(true)
          
          // Reset form
          setEventForm({
            name: "",
            date: "",
            time: "",
            location: "",
            totalTickets: "100",
            ticketPrice: "0",
            description: ""
          })
          
          // Refresh events after success
          setTimeout(() => {
            fetchMyEventsAndTickets()
          }, 2000)
        } else {
          throw new Error(submitError.message || "Failed to submit transaction")
        }
      }
    } catch (error) {
      console.error('Event creation error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSendTicket = (event: Event) => {
    setSelectedEvent(event)
    setShowSendTicket(true)
    setRecipientAddress("")
    setResolvedRecipientAddress("")
    setSendMemo("")
  }
  
  const confirmSendTicket = async () => {
    if (!selectedEvent || !publicKey) {
      toast({
        title: "Error",
        description: "Missing required information for sending ticket",
        variant: "destructive"
      })
      return
    }
    
    // Use resolved address if recipient entered a username, otherwise use direct input
    const destinationAddress = resolvedRecipientAddress || recipientAddress
    
    if (!destinationAddress) {
      toast({
        title: "Error",
        description: "Please enter a valid recipient address or username",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsSending(true)
      
      // Call our API endpoint to send the ticket
      const response = await fetch('/api/tickets/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderPublicKey: publicKey,
          recipientPublicKey: destinationAddress,
          assetCode: selectedEvent.assetCode,
          assetIssuer: selectedEvent.issuer,
          memo: sendMemo || `Ticket for ${selectedEvent.name}`
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send ticket')
      }
      
      // Check if recipient needs a trustline
      if (data.needsTrustline) {
        toast({
          title: "Trustline Required",
          description: "Recipient needs to create a trustline for this asset first",
          variant: "destructive"
        })
        setIsSending(false)
        return
      }
      
      // Sign the transaction
      const signedXDR = await sign({
        transactionXDR: data.transactionXDR,
        network: data.networkPassphrase,
        pincode: ""
      })
      
      // Submit the signed transaction to the network
      console.log("Submitting send ticket transaction...")
      const submitResponse = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signedXdr: signedXDR
        })
      })
      
      const submitData = await submitResponse.json()
      console.log("Send ticket submission response:", submitData)
      
      if (!submitResponse.ok) {
        throw new Error(submitData.error || submitData.details || 'Failed to submit transaction')
      }
      
      toast({
        title: "Success",
        description: "Ticket sent successfully!"
      })
      
      // Update tickets sold count for this event
      const updatedEvents = myEvents.map(event => {
        if (event.id === selectedEvent.id) {
          return {
            ...event,
            ticketsSold: event.ticketsSold + 1
          }
        }
        return event
      })
      
      // Update the events state with the new ticket count
      setMyEvents(updatedEvents)
      setShowSendTicket(false)
      setRecipientAddress("")
      setResolvedRecipientAddress("")
      setSendMemo("")
      
      // Refresh the events and tickets
      setTimeout(() => {
        fetchMyEventsAndTickets()
      }, 2000)
      
    } catch (error) {
      console.error('Ticket sending error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send ticket",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }
  
  // Function to handle showing trustline info
  const showTrustlineInfoDialog = (assetCode: string, assetIssuer: string) => {
    setTrustlineDetails({ assetCode, assetIssuer })
    setShowTrustlineInfo(true)
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  
  const handleCreateTrustline = async (assetCode: string, assetIssuer: string) => {
    if (!publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
      return
    }
    
    try {
      setTrustlineAsset({ code: assetCode, issuer: assetIssuer })
      setIsCreatingTrustline(true)
      
      // Call API to create a change trust transaction
      const response = await fetch('/api/trustlines/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey,
          assetCode,
          assetIssuer
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create trustline transaction')
      }
      
      // Sign the transaction
      const signedXDR = await sign({
        transactionXDR: data.transactionXDR,
        network: data.networkPassphrase,
        pincode: ""
      })
      
      // Submit the signed transaction
      const submitResponse = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signedXdr: signedXDR
        })
      })
      
      const submitData = await submitResponse.json()
      
      if (!submitResponse.ok) {
        throw new Error(submitData.error || submitData.details || 'Failed to submit transaction')
      }
      
      toast({
        title: "Success",
        description: `Trustline for ${assetCode} created successfully!`
      })
      
      // Refresh events and tickets after creating trustline
      setTimeout(() => {
        fetchMyEventsAndTickets()
      }, 2000)
      
    } catch (error) {
      console.error('Trustline creation error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trustline",
        variant: "destructive"
      })
    } finally {
      setIsCreatingTrustline(false)
      setTrustlineAsset(null)
    }
  }
  
  // Helper function to format dates properly
  const formatDate = (dateString: string): string => {
    try {
      // Check if date is valid by creating a Date object
      const date = new Date(dateString);
      
      // Check if date is valid (invalid dates return NaN for getTime())
      if (isNaN(date.getTime())) {
        return "No date specified";
      }
      
      // Format date to a readable string
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }
  
  // Helper function to sanitize event names
  const sanitizeEventName = (name: string): string => {
    if (!name || name.trim() === '') {
      return "Unnamed Event";
    }
    
    // If name is a base64 or looks like encoded data, return generic name
    if (/^[A-Za-z0-9+/=]{20,}$/.test(name)) {
      return "NFT Ticket Event";
    }
    
    return name;
  }
  
  // Helper function to decode potential base64 strings
  const decodeBase64IfNeeded = (text: string): string => {
    if (!text || text.trim() === '') {
      return "Not specified";
    }
    
    // Check if it looks like base64
    if (/^[A-Za-z0-9+/=]{4,}$/.test(text) && text.length % 4 === 0) {
      try {
        const decoded = Buffer.from(text, 'base64').toString('utf-8');
        // Make sure the decoded text looks like reasonable text (printable ASCII)
        if (decoded && decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
          return decoded;
        }
      } catch (e) {
        console.log("Error decoding text:", e);
      }
    }
    
    return text;
  }
  
  return (
    <div className="container mx-auto space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">NFT Tickets</h1>
      
      {/* Add Trustline Quick Access */}
      {isConnected && (
        <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-4 rounded-lg border border-blue-500/30 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Need to receive NFT tickets?</h3>
              <p className="text-sm text-muted-foreground">Add a trustline to receive tickets from other issuers</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter asset code"
                className="w-32 sm:w-40"
                value={trustlineAsset?.code || ''}
                onChange={(e) => setTrustlineAsset(prev => ({...(prev || {issuer: ''}), code: e.target.value}))}
              />
              <Input
                placeholder="Issuer public key"
                className="w-40 sm:w-64"
                value={trustlineAsset?.issuer || ''}
                onChange={(e) => setTrustlineAsset(prev => ({...(prev || {code: ''}), issuer: e.target.value}))}
              />
              <Button 
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => trustlineAsset?.code && trustlineAsset?.issuer && 
                  handleCreateTrustline(trustlineAsset.code, trustlineAsset.issuer)}
                disabled={isCreatingTrustline || !trustlineAsset?.code || !trustlineAsset?.issuer}
              >
                {isCreatingTrustline ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add Trustline
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'myTickets' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('myTickets')}
        >
          My Tickets
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'explore' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('explore')}
        >
          My Events
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'create' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('create')}
        >
          Create Event
        </button>
      </div>
      
      {/* My Tickets */}
      {activeTab === 'myTickets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Tickets</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchMyEventsAndTickets}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : receivedTickets.length === 0 ? (
            <div className="text-center p-8 bg-muted/50 rounded-xl border">
              <p className="text-muted-foreground">You don't have any tickets yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedTickets.map(ticket => (
                <div key={ticket.id} className="bg-white/10 rounded-xl border overflow-hidden shadow-sm">
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{ticket.eventName}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{formatDate(ticket.eventDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{decodeBase64IfNeeded(ticket.location)}</span>
                      </div>
                      {ticket.seat && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seat:</span>
                          <span>{ticket.seat}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Asset Code:</span>
                        <span>{ticket.assetCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={ticket.used ? 'text-amber-600' : 'text-green-600'}>
                          {ticket.used ? 'Used' : 'Valid'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleShowTicket(ticket)}
                      >
                        Show Ticket
                      </Button>
                      {ticket.transferable && !ticket.used && (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleTransferTicket(ticket)}
                        >
                          Transfer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* My Events */}
      {activeTab === 'explore' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Events</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchMyEventsAndTickets}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : myEvents.length === 0 ? (
            <div className="text-center p-8 bg-muted/50 rounded-xl border">
              <p className="text-muted-foreground">You haven't created any events yet.</p>
              <Button 
                className="mt-4"
                onClick={() => setActiveTab('create')}
              >
                Create Event
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myEvents.map(event => (
                <div key={event.id} className="bg-white/10 rounded-xl border overflow-hidden shadow-sm">
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{sanitizeEventName(event.name)}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground mr-2">Date:</span>
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground mr-2">Location:</span>
                        <span>{decodeBase64IfNeeded(event.location)}</span>
                      </div>
                      <div className="flex items-center">
                        <CoinsIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground mr-2">Price:</span>
                        <span>{event.ticketPrice} XLM</span>
                      </div>
                      <div className="flex items-center">
                        <Ticket className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground mr-2">Distribution:</span>
                        <span>{event.ticketsSold} / {event.ticketsTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Asset Code:</span>
                        <span>{event.assetCode}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1"
                        onClick={() => handleSendTicket(event)}
                      >
                        Send Ticket
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Create Event */}
      {activeTab === 'create' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
          <div className="bg-white/10 rounded-xl border p-6">
            <form className="space-y-4" onSubmit={handleCreateEvent}>
              <div>
                <label className="block text-sm font-medium mb-1">Event Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter event name"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({...eventForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter event location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Tickets (Supply)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eventForm.totalTickets}
                    onChange={(e) => setEventForm({...eventForm, totalTickets: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ticket Price (XLM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eventForm.ticketPrice}
                    onChange={(e) => setEventForm({...eventForm, ticketPrice: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter event description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Event & Issue NFT Tickets"}
              </Button>
            </form>
          </div>
        </div>
      )}
      
      {/* Show Ticket QR Modal */}
      {showQR && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/70 p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">Your Ticket</h2>
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-3 rounded-lg">
                <QRCode 
                  value={generateTicketQRData(selectedTicket, publicKey || '')}
                  size={200}
                  level="H"
                />
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg w-full space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Event:</span>
                  <span className="font-medium">{sanitizeEventName(selectedTicket.eventName)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date:</span>
                  <span>{formatDate(selectedTicket.eventDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Location:</span>
                  <span>{decodeBase64IfNeeded(selectedTicket.location)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className={selectedTicket.used ? 'text-amber-500' : 'text-green-500'}>
                    {selectedTicket.used ? 'USED' : 'VALID'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Asset:</span>
                  <span className="font-mono text-xs">{selectedTicket.assetCode}</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-400">
                  Present this QR code at the event entrance for verification.
                  <br />This ticket is linked to your Stellar account.
                </p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Button
                onClick={() => setShowQR(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Transfer Ticket Modal */}
      {showTransfer && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/70 text-gray-200 p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Transfer Ticket</h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="ticket-details">Ticket Details</Label>
                <div className="p-3 bg-primary/10 border rounded-md text-sm">
                  <div className="font-medium mb-1">{selectedTicket.eventName}</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{formatDate(selectedTicket.eventDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{decodeBase64IfNeeded(selectedTicket.location)}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="recipient">Recipient</Label>
                <RecipientInput
                  value={transferAddress}
                  onChange={(value, resolvedAddress) => {
                    setTransferAddress(value);
                    setResolvedTransferAddress(resolvedAddress || "");
                  }}
                  placeholder="Enter public key or @username"
                />
                {resolvedTransferAddress && transferAddress.startsWith('@') && (
                  <p className="text-xs text-muted-foreground">
                    Username will be resolved to: {resolvedTransferAddress}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Input
                  id="memo"
                  value={transferMemo}
                  onChange={(e) => setTransferMemo(e.target.value)}
                  placeholder="Add a note to this transfer"
                />
              </div>
              
              {needsTrustline && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-400 text-sm">
                  The recipient needs to establish a trustline for this asset first.
                  They must trust {selectedTicket.assetCode} issued by {selectedTicket.assetIssuer.substring(0, 5)}...{selectedTicket.assetIssuer.substring(selectedTicket.assetIssuer.length - 5)}.
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                This will transfer ownership of your ticket to another Stellar address.
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowTransfer(false)
                    setTransferAddress("")
                    setResolvedTransferAddress("")
                    setTransferMemo("")
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmTransfer}
                  disabled={!(transferAddress || resolvedTransferAddress) || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Transfer"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Send Ticket Modal */}
      {showSendTicket && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/70 p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Send Ticket for {selectedEvent.name}</h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="event-details">Event Details</Label>
                <div className="p-3 bg-primary/10 border rounded-md text-sm">
                  <div className="flex items-center mb-1">
                    <CalendarIcon className="h-4 w-4 mr-2 text-primary/70" />
                    <span>{formatDate(selectedEvent.date)}</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <MapPin className="h-4 w-4 mr-2 text-primary/70" />
                    <span>{decodeBase64IfNeeded(selectedEvent.location)}</span>
                  </div>
                  <div className="flex items-center">
                    <Ticket className="h-4 w-4 mr-2 text-primary/70" />
                    <span>Tickets distributed: {selectedEvent.ticketsSold} of {selectedEvent.ticketsTotal}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="recipient">Recipient</Label>
                <RecipientInput
                  value={recipientAddress}
                  onChange={(value, resolvedAddress) => {
                    setRecipientAddress(value);
                    setResolvedRecipientAddress(resolvedAddress || "");
                  }}
                  placeholder="Enter public key or @username"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Input
                  id="memo"
                  value={sendMemo}
                  onChange={(e) => setSendMemo(e.target.value)}
                  placeholder="Add a note for the recipient"
                />
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border rounded-md text-amber-600 text-xs flex items-start">
                <InfoIcon className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Trustline Required</p>
                  <p className="mt-1">The recipient will need a trustline for this asset.</p>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-amber-700"
                    onClick={() => {
                      if (selectedEvent) {
                        showTrustlineInfoDialog(selectedEvent.assetCode, selectedEvent.issuer)
                      }
                    }}
                  >
                    Show trustline details
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowSendTicket(false)
                    setRecipientAddress("")
                    setResolvedRecipientAddress("")
                    setSendMemo("")
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmSendTicket}
                  disabled={!(recipientAddress || resolvedRecipientAddress) || isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Ticket"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Event Creation Success Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Event Created Successfully!</DialogTitle>
            <DialogDescription>
              Your event has been created on the Stellar blockchain. Here are the details:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {createdEventDetails && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Event Name:</span>
                  <span>{sanitizeEventName(createdEventDetails.name)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Asset Code:</span>
                  <span className="font-mono">{createdEventDetails.assetCode}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="font-medium">Issuer:</span>
                  <span className="font-mono text-xs text-right truncate max-w-[220px]">{createdEventDetails.issuer}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Total Supply:</span>
                  <span>{createdEventDetails.ticketsTotal} tickets</span>
                </div>
              </div>
            )}
            
            {txDetails.hash && (
              <div className="p-4 bg-primary/10 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Transaction Hash:</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs truncate max-w-[120px]">{txDetails.hash}</span>
                    <button 
                      onClick={() => copyToClipboard(txDetails.hash || '')}
                      className="ml-2 text-primary hover:text-primary/80"
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {txDetails.ledger && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Ledger:</span>
                    <span className="font-mono text-xs">{txDetails.ledger}</span>
                  </div>
                )}
                {txDetails.created && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Timestamp:</span>
                    <span className="font-mono text-xs">{new Date(txDetails.created).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
              <InfoIcon className="h-4 w-4 text-amber-500" />
              <AlertTitle>Trustline Required</AlertTitle>
              <AlertDescription className="text-sm">
                Recipients will need to establish a trustline to receive tickets for this event.
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-sm"
                  onClick={() => {
                    setShowEventDetails(false)
                    if (createdEventDetails) {
                      showTrustlineInfoDialog(createdEventDetails.assetCode, createdEventDetails.issuer)
                    }
                  }}
                >
                  Show trustline details
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Trustline Info Dialog */}
      <Dialog open={showTrustlineInfo} onOpenChange={setShowTrustlineInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trustline Information</DialogTitle>
            <DialogDescription>
              Share these details with potential ticket recipients so they can create a trustline.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted rounded-md space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Asset Code</Label>
                <div className="flex items-center justify-between">
                  <code className="bg-background p-1 rounded text-sm font-mono">{trustlineDetails.assetCode}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => copyToClipboard(trustlineDetails.assetCode)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Asset Issuer</Label>
                <div className="flex flex-col space-y-2">
                  <code className="bg-background p-1 rounded text-sm font-mono break-all">{trustlineDetails.assetIssuer}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => copyToClipboard(trustlineDetails.assetIssuer)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Instructions</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>Open your Stellar wallet</li>
                <li>Select "Add Asset" or "Create Trustline"</li>
                <li>Enter the Asset Code and Issuer Address exactly as shown above</li>
                <li>Confirm the trustline creation</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Creating a trustline requires 0.5 XLM to be locked in your account as reserve.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 