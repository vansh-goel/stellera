"use client"

import React, { useState } from "react"
import { Button } from "@/app/components/ui/button"

type Friend = {
  id: string
  name: string
  stellarId: string
  owes: number
  isOwed: number
}

type Expense = {
  id: string
  description: string
  amount: number
  paidBy: string
  date: string
  participants: string[]
  settled: boolean
}

export default function SplitwisePage() {
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: "1",
      name: "Alice",
      stellarId: "GBEWK...UKX5",
      owes: 0,
      isOwed: 75.5,
    },
    {
      id: "2",
      name: "Bob",
      stellarId: "GDRPT...ZWE4",
      owes: 45.25,
      isOwed: 0,
    },
    {
      id: "3",
      name: "Charlie",
      stellarId: "GDSMR...YUV2",
      owes: 30.25,
      isOwed: 0,
    },
  ])

  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: "e1",
      description: "Dinner at Restaurant",
      amount: 120.75,
      paidBy: "1", // Alice
      date: "2023-04-24",
      participants: ["1", "2", "3"],
      settled: false,
    },
    {
      id: "e2",
      description: "Movie Tickets",
      amount: 30.25,
      paidBy: "2", // Bob
      date: "2023-04-22",
      participants: ["1", "2"],
      settled: true,
    },
  ])

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    paidBy: "",
    participants: [] as string[],
  })

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would create a new expense and update balances
    setShowAddExpense(false)
  }

  const settleUp = (friendId: string) => {
    // In a real app, this would create a Stellar transaction to settle debt
    const updatedFriends = friends.map(friend => {
      if (friend.id === friendId) {
        return { ...friend, owes: 0 }
      }
      return friend
    })
    setFriends(updatedFriends)
  }

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Splitwise</h1>
        <Button onClick={() => setShowAddExpense(true)}>Add Expense</Button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
          <h3 className="text-lg font-medium mb-4">Total Balance</h3>
          <div className="text-3xl font-bold text-primary">
            {friends.reduce((acc, friend) => acc + (friend.isOwed - friend.owes), 0).toFixed(2)} XLM
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
          <h3 className="text-lg font-medium mb-4">You are owed</h3>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {friends.reduce((acc, friend) => acc + friend.owes, 0).toFixed(2)} XLM
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-6 border shadow-sm">
          <h3 className="text-lg font-medium mb-4">You owe</h3>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {friends.reduce((acc, friend) => acc + friend.isOwed, 0).toFixed(2)} XLM
          </div>
        </div>
      </div>

      {/* Friends and Balances */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Friends</h2>
        <div className="bg-white/10 rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <div className="grid grid-cols-12 font-medium">
              <div className="col-span-3">Name</div>
              <div className="col-span-5">Stellar ID</div>
              <div className="col-span-2 text-right">Balance</div>
              <div className="col-span-2"></div>
            </div>
          </div>
          
          <div className="divide-y">
            {friends.map((friend) => (
              <div key={friend.id} className="p-4 grid grid-cols-12 items-center">
                <div className="col-span-3 font-medium">{friend.name}</div>
                <div className="col-span-5 text-sm text-muted-foreground truncate">{friend.stellarId}</div>
                <div className={`col-span-2 font-medium text-right ${friend.owes > 0 ? 'text-green-600 dark:text-green-400' : friend.isOwed > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {friend.owes > 0 ? `+${friend.owes}` : friend.isOwed > 0 ? `-${friend.isOwed}` : '0'} XLM
                </div>
                <div className="col-span-2 flex justify-end">
                  {friend.owes > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => settleUp(friend.id)}
                    >
                      Request
                    </Button>
                  )}
                  {friend.isOwed > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => settleUp(friend.id)}
                    >
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Expenses</h2>
        <div className="bg-white/10 rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <div className="grid grid-cols-12 font-medium">
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Paid By</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
          </div>
          
          <div className="divide-y">
            {expenses.map((expense) => {
              const paidByFriend = friends.find(f => f.id === expense.paidBy)
              return (
                <div key={expense.id} className="p-4 grid grid-cols-12 items-center">
                  <div className="col-span-4 font-medium">{expense.description}</div>
                  <div className="col-span-2">{expense.amount} XLM</div>
                  <div className="col-span-2">{paidByFriend?.name}</div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString()}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${expense.settled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                      {expense.settled ? 'Settled' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Dinner, Movie, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Paid By</label>
                <select
                  value={newExpense.paidBy}
                  onChange={(e) => setNewExpense({...newExpense, paidBy: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select who paid</option>
                  <option value="you">You</option>
                  {friends.map(friend => (
                    <option key={friend.id} value={friend.id}>{friend.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Split With</label>
                <div className="space-y-2 mt-2">
                  {friends.map(friend => (
                    <label key={friend.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newExpense.participants.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewExpense({
                              ...newExpense,
                              participants: [...newExpense.participants, friend.id]
                            })
                          } else {
                            setNewExpense({
                              ...newExpense,
                              participants: newExpense.participants.filter(id => id !== friend.id)
                            })
                          }
                        }}
                        className="mr-2"
                      />
                      {friend.name}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowAddExpense(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 