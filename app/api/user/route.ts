import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/app/lib/mongodb'
import Username from '@/app/models/username'

/**
 * GET /api/user
 * 
 * Retrieves user information from the database by public key
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const publicKey = searchParams.get('publicKey')
  
  if (!publicKey) {
    return NextResponse.json({ error: 'Public key is required' }, { status: 400 })
  }
  
  try {
    await connectToDatabase()
    
    // First check if the user has a registered username
    const userRecord = await Username.findOne({
      stellarAddress: publicKey
    })
    
    if (userRecord) {
      return NextResponse.json({
        name: userRecord.displayName || userRecord.username || null,
        username: userRecord.username || null,
        publicKey: userRecord.stellarAddress
      })
    }
    
    // If no user record found, check payment usernames
    const usernameRecord = await Username.findOne({
      publicKey: publicKey
    })
    
    if (usernameRecord) {
      return NextResponse.json({
        name: usernameRecord.username || null,
        username: usernameRecord.username || null,
        publicKey: publicKey
      })
    }
    
    // No user found with this public key
    return NextResponse.json({
      name: null,
      username: null,
      publicKey: publicKey
    })
  } catch (error) {
    console.error('Error retrieving user:', error)
    return NextResponse.json({ error: 'Failed to retrieve user information' }, { status: 500 })
  }
} 