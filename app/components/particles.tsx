"use client"

import React, { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  color: string
  amplitude: number
  frequency: number
}

export function Particles() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Color palette for particles (space/stellar theme)
    const colors = [
      'rgba(255, 255, 255, 1)',  // White
      'rgba(176, 196, 255, 1)',  // Light blue
      'rgba(155, 176, 255, 1)',  // Blue
      'rgba(214, 188, 255, 1)',  // Light purple
      'rgba(255, 223, 214, 1)',  // Light pink
    ]

    // Create initial particles
    const initialParticles: Particle[] = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // position as percentage of viewport width
      y: Math.random() * 100, // position as percentage of viewport height
      size: Math.random() * 2 + 1, // size between 1-3px
      speed: Math.random() * 0.3 + 0.05, // speed for upward movement
      opacity: Math.random() * 0.6 + 0.2, // opacity between 0.2-0.8
      color: colors[Math.floor(Math.random() * colors.length)],
      amplitude: Math.random() * 1.5 + 0.5, // horizontal movement amplitude
      frequency: Math.random() * 0.01 + 0.005 // horizontal movement frequency
    }))

    setParticles(initialParticles)

    // Animation function
    const animateParticles = () => {
      setParticles(prevParticles =>
        prevParticles.map(particle => {
          // Move particle upward
          let newY = particle.y - particle.speed
          
          // If particle is out of viewport, reset it to bottom
          if (newY < -5) {
            return {
              ...particle,
              y: 105 + Math.random() * 10, // Start slightly below viewport
              x: Math.random() * 100, // New random horizontal position
              speed: Math.random() * 0.3 + 0.05, // Randomize speed again
              size: Math.random() * 2 + 1, // Randomize size again
            }
          }
          
          // Add subtle horizontal movement (sine wave)
          const time = Date.now() * particle.frequency
          const newX = particle.x + Math.sin(time) * particle.amplitude * 0.05
          
          return {
            ...particle,
            y: newY,
            x: newX,
          }
        })
      )
    }

    // Set up animation loop
    const animationId = setInterval(animateParticles, 50)
    
    // Clean up interval on component unmount
    return () => clearInterval(animationId)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1]">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transition: 'left 0.3s ease, top 0.3s ease',
          }}
        />
      ))}
    </div>
  )
} 