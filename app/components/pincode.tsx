"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Particles } from "./particles"

interface PincodeProps {
  onVerify: () => void
  isSetup?: boolean
}

export function Pincode({ onVerify, isSetup = false }: PincodeProps) {
  const [pincode, setPincode] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [showKeyboard, setShowKeyboard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleKeyPress = (key: string) => {
    if (key === "backspace") {
      setPincode(pincode.slice(0, -1))
      setError("")
    } else if (/^\d$/.test(key) && pincode.length < 4) {
      const newPincode = pincode + key
      setPincode(newPincode)
      setError("")

      if (newPincode.length === 4) {
        if (isSetup) {
          localStorage.setItem("stellera_pincode", newPincode)
          onVerify()
        } else {
          const savedPincode = localStorage.getItem("stellera_pincode")
          if (savedPincode === newPincode) {
            onVerify()
          } else {
            setError("Incorrect pincode")
            setPincode("")
          }
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      handleKeyPress("backspace")
    } else if (/^\d$/.test(e.key)) {
      handleKeyPress(e.key)
    }
  }

  const renderKey = (key: string) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      className="w-16 h-16 rounded-full bg-white/5 text-gray-200 text-xl font-medium flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm border border-white/10"
      onClick={() => handleKeyPress(key)}
    >
      {key === "backspace" ? "⌫" : key}
    </motion.button>
  )

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      {/* Background particles */}
      <Particles />
      
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl"></div>
        <div className="absolute bottom-40 left-20 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 max-w-sm w-full shadow-2xl">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold text-gray-200 mb-8 text-center"
        >
          {isSetup ? "Set up your pincode" : "Enter your pincode"}
        </motion.h2>
        
        <div className="space-y-6">
          <div className="flex justify-center space-x-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  scale: i < pincode.length ? [1, 1.2, 1] : 1,
                  backgroundColor: i < pincode.length ? "rgba(59, 130, 246, 0.2)" : "transparent",
                  borderColor: i < pincode.length ? "rgb(59, 130, 246)" : "rgba(255, 255, 255, 0.1)",
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="w-5 h-5 rounded-full border-2"
              />
            ))}
          </div>

          <input
            ref={inputRef}
            type="password"
            className="sr-only"
            value={pincode}
            onKeyDown={handleKeyDown}
            onChange={() => {}} // Prevent React warning
            autoComplete="off"
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-400 text-sm text-center"
          >
            {isSetup
              ? "Enter a 4-digit pincode to secure your wallet"
              : "Enter your 4-digit pincode to continue"}
          </motion.p>

          {/* Mobile Keyboard */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <div key={num} className="flex justify-center">
                {renderKey(num.toString())}
              </div>
            ))}
            <div className="flex justify-center">
              {renderKey("0")}
            </div>
            <div className="flex justify-center">
              {renderKey("backspace")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 