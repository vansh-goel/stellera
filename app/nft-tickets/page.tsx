"use client"

import React, { useState } from "react"
import { Button } from "@/app/components/ui/button"

type Event = {
  id: string
  name: string
  date: string
  location: string
  ticketsTotal: number
  ticketsSold: number
  ticketPrice: number
  imageUrl: string
}

type Ticket = {
  id: string
  eventId: string
  seat: string
  owner: string
  used: boolean
  transferable: boolean
  assetId: string
}

export default function NFTTicketsPage() {
  const [activeTab, setActiveTab] = useState<'myTickets' | 'explore' | 'create'>('myTickets')
  
  const [myEvents, setMyEvents] = useState<Event[]>([])
  
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([
    {
      id: "e1",
      name: "Annual Tech Conference",
      date: "2023-06-15",
      location: "San Francisco Convention Center",
      ticketsTotal: 500,
      ticketsSold: 342,
      ticketPrice: 50,
      imageUrl: "https://via.placeholder.com/400x200?text=Tech+Conference",
    },
    {
      id: "e2",
      name: "Summer Music Festival",
      date: "2023-07-10",
      location: "Central Park, New York",
      ticketsTotal: 2000,
      ticketsSold: 1567,
      ticketPrice: 75,
      imageUrl: "https://via.placeholder.com/400x200?text=Music+Festival",
    },
    {
      id: "e3",
      name: "Blockchain Summit",
      date: "2023-05-25",
      location: "Virtual Event",
      ticketsTotal: 1000,
      ticketsSold: 876,
      ticketPrice: 25,
      imageUrl: "https://via.placeholder.com/400x200?text=Blockchain+Summit",
    },
  ])
  
  const [myTickets, setMyTickets] = useState<Ticket[]>([
    {
      id: "t1",
      eventId: "e1",
      seat: "G23",
      owner: "G35IUZF78COLG6UEFYWGQYPDET7PLMROMGZI7SEQELL2SYAYAYOZEK3S",
      used: false,
      transferable: true,
      assetId: "NFT:TECH:CONF:2023:G23",
    },
    {
      id: "t2",
      eventId: "e3",
      seat: "General Admission",
      owner: "G35IUZF78COLG6UEFYWGQYPDET7PLMROMGZI7SEQELL2SYAYAYOZEK3S",
      used: false,
      transferable: true,
      assetId: "NFT:BLOCKCHAIN:SUMMIT:2023:GA",
    },
  ])
  
  const [showQR, setShowQR] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAddress, setTransferAddress] = useState("")
  
  const getEventDetails = (eventId: string) => {
    return upcomingEvents.find(event => event.id === eventId)
  }
  
  const handleShowTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowQR(true)
  }
  
  const handleTransferTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowTransfer(true)
  }
  
  const confirmTransfer = () => {
    // In a real app, this would create a Stellar transaction to transfer the NFT
    // For this mock, we'll just update the state
    if (selectedTicket && transferAddress) {
      const updatedTickets = myTickets.filter(t => t.id !== selectedTicket.id)
      setMyTickets(updatedTickets)
      setShowTransfer(false)
      setTransferAddress("")
    }
  }
  
  const buyTicket = (eventId: string) => {
    // In a real app, this would create a Stellar transaction to mint the NFT
    // For this mock, we'll just update the state
    const event = upcomingEvents.find(e => e.id === eventId)
    if (event) {
      const newTicket: Ticket = {
        id: `t${myTickets.length + 1}`,
        eventId,
        seat: "General Admission",
        owner: "G35IUZF78COLG6UEFYWGQYPDET7PLMROMGZI7SEQELL2SYAYAYOZEK3S",
        used: false,
        transferable: true,
        assetId: `NFT:${event.name.toUpperCase().replace(/\s/g, ':')}:${myTickets.length + 1}`,
      }
      setMyTickets([...myTickets, newTicket])
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
          Explore Events
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
          
          {myTickets.length === 0 ? (
            <div className="text-center p-8 bg-muted/50 rounded-xl border">
              <p className="text-muted-foreground">You don't have any tickets yet.</p>
              <Button 
                className="mt-4"
                onClick={() => setActiveTab('explore')}
              >
                Browse Events
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myTickets.map(ticket => {
                const event = getEventDetails(ticket.eventId)
                return (
                  <div key={ticket.id} className="bg-white/10 rounded-xl border overflow-hidden shadow-sm">
                    {event?.imageUrl && (
                      <div className="relative h-40 bg-muted">
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${event.imageUrl})` }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{event?.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{new Date(event?.date || "").toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location:</span>
                          <span>{event?.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seat:</span>
                          <span>{ticket.seat}</span>
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
                )
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Explore Events */}
      {activeTab === 'explore' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="bg-white/10 rounded-xl border overflow-hidden shadow-sm">
                {event.imageUrl && (
                  <div className="relative h-40 bg-muted">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${event.imageUrl})` }}
                    />
                  </div>
                )}
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
                      <span className="text-muted-foreground">Availability:</span>
                      <span>{event.ticketsTotal - event.ticketsSold} / {event.ticketsTotal}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4"
                    onClick={() => buyTicket(event.id)}
                  >
                    Buy Ticket
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Create Event */}
      {activeTab === 'create' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
          <div className="bg-white/10 rounded-xl border p-6">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter event name"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter event location"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Tickets</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ticket Price (XLM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Event Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter event description"
                />
              </div>
              
              <Button className="w-full">Create Event & Issue NFT Tickets</Button>
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
                  {selectedTicket.assetId}
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
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmTransfer}
                  disabled={!transferAddress}
                >
                  Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 