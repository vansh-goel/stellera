"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { useWallet } from "@/app/providers/wallet-provider"
import { useToast } from "@/app/hooks/use-toast"

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
  const [activeTab, setActiveTab] = useState<'myTickets' | 'explore' | 'create'>('myTickets')
  
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [receivedTickets, setReceivedTickets] = useState<Ticket[]>([])
  
  const [showQR, setShowQR] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAddress, setTransferAddress] = useState("")
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
  const [sendMemo, setSendMemo] = useState("")
  const [isSending, setIsSending] = useState(false)
  
  // Fetch user's events and tickets when wallet connects
  useEffect(() => {
    if (isConnected && publicKey) {
      fetchMyEventsAndTickets()
    }
  }, [isConnected, publicKey])
  
  const fetchMyEventsAndTickets = async () => {
    if (!publicKey) return
    
    // In a real app, these would be API calls to fetch from a database
    // Here we'll just set empty arrays for now
    setMyEvents([])
    setReceivedTickets([])
  }
  
  const handleShowTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowQR(true)
  }
  
  const handleTransferTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowTransfer(true)
    setNeedsTrustline(false)
    setTransferAddress("")
    setTransferMemo("")
  }
  
  const confirmTransfer = async () => {
    if (!selectedTicket || !transferAddress || !publicKey) {
      toast({
        title: "Error",
        description: "Missing required information for transfer",
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
          recipientPublicKey: transferAddress,
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
      
      // In a real app, you would submit the signed transaction to the network
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
      setTransferMemo("")
      
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
      
      // Format event date and time
      const eventDateTime = new Date(`${eventForm.date}T${eventForm.time || '00:00'}`)
      const ipfsHash = `ipfs://sample-hash-${Date.now()}`  // In a real app, you'd upload event info to IPFS
      
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
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event')
      }
      
      // Sign the transaction using the wallet
      const signedXDR = await sign({
        transactionXDR: data.transactionXDR,
        network: data.networkPassphrase,
        pincode: ""
      })
      
      // In a real app, you would submit the signed transaction to the network
      toast({
        title: "Success",
        description: "Event created successfully!"
      })
      
      // Add the new event to the user's events list
      const newEvent: Event = {
        id: Date.now().toString(),
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
    setSendMemo("")
  }
  
  const confirmSendTicket = async () => {
    if (!selectedEvent || !recipientAddress || !publicKey) {
      toast({
        title: "Error",
        description: "Missing required information for sending ticket",
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
          recipientPublicKey: recipientAddress,
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
      
      // In a real app, you would submit the signed transaction to the network
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
      
      setMyEvents(updatedEvents)
      setShowSendTicket(false)
      setRecipientAddress("")
      setSendMemo("")
      
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
  
  return (
    <div className="container mx-auto space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">NFT Tickets</h1>
      
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
          <h2 className="text-xl font-semibold mb-4">My Tickets</h2>
          
          {receivedTickets.length === 0 ? (
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
                        <span>{new Date(ticket.eventDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{ticket.location}</span>
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
          <h2 className="text-xl font-semibold mb-4">My Events</h2>
          
          {myEvents.length === 0 ? (
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
                    <h3 className="font-semibold text-lg mb-2">{event.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{event.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span>{event.ticketPrice} XLM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distribution:</span>
                        <span>{event.ticketsSold} / {event.ticketsTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Asset Code:</span>
                        <span>{event.assetCode}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4"
                      onClick={() => handleSendTicket(event)}
                    >
                      Send Ticket
                    </Button>
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
          <div className="bg-background p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">Your Ticket</h2>
            <div className="flex justify-center">
              <div className="border border-input p-4 rounded bg-background">
                {/* This would be a QR code in a real application */}
                <div className="w-48 h-48 bg-primary/10 flex items-center justify-center text-xs text-center text-muted-foreground">
                  QR Code for Ticket<br />
                  {selectedTicket.assetCode}
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Present this QR code at the venue for entry</p>
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
          <div className="bg-background p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Transfer Ticket</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Recipient Stellar Address</label>
                <input
                  type="text"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="G..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Memo (Optional)</label>
                <input
                  type="text"
                  value={transferMemo}
                  onChange={(e) => setTransferMemo(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    setTransferMemo("")
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmTransfer}
                  disabled={!transferAddress || isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Transfer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Send Ticket Modal */}
      {showSendTicket && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Send Ticket for {selectedEvent.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Recipient Stellar Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="G..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Memo (Optional)</label>
                <input
                  type="text"
                  value={sendMemo}
                  onChange={(e) => setSendMemo(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add a note for the recipient"
                />
              </div>
              
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400 text-sm">
                <p>You are sending a ticket for: <strong>{selectedEvent.name}</strong></p>
                <p>Tickets distributed: {selectedEvent.ticketsSold} of {selectedEvent.ticketsTotal}</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowSendTicket(false)
                    setRecipientAddress("")
                    setSendMemo("")
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmSendTicket}
                  disabled={!recipientAddress || isSending}
                >
                  {isSending ? "Sending..." : "Send Ticket"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 