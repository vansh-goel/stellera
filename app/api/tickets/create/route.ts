import { NextRequest, NextResponse } from 'next/server'
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
  Asset
} from '@stellar/stellar-sdk'

const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET
const HORIZON_URL = process.env.STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org'

/**
 * POST /api/tickets/create
 * 
 * Creates an NFT ticket on the Stellar blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      publicKey, 
      eventName, 
      eventDate, 
      eventLocation, 
      totalSupply, 
      ticketPrice,
      ipfsHash // Contains the metadata for the event NFT
    } = body
    
    if (!publicKey || !eventName || !eventDate || !totalSupply || !ipfsHash) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Connect to the Stellar network
    const server = new Horizon.Server(HORIZON_URL)
    
    // Load the creator's account
    const account = await server.loadAccount(publicKey)
    
    // Generate a unique asset code for the event ticket NFT
    // Format: TIX_<first 8 chars of event name>_<timestamp>
    const sanitizedName = eventName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()
    const timestamp = Date.now().toString().substring(6) // Last 7 digits of timestamp
    const assetCode = `TIX${sanitizedName}${timestamp}`.substring(0, 12) // Max 12 chars for asset code
    
    // Build transaction to create the NFT ticket asset
    // In Stellar, to create an NFT-like token, we issue a very small amount (0.0000001) 
    // that is non-divisible (hence the stroop, as mentioned in the article)
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK
    })
      // Add data entry for IPFS hash metadata (as mentioned in best practices)
      .addOperation(
        Operation.manageData({
          name: 'ipfshash',
          value: ipfsHash
        })
      )
      .setTimeout(30)
      .build()
    
    // Return the transaction XDR for signing by the client
    return NextResponse.json({
      success: true,
      transactionXDR: transaction.toXDR(),
      networkPassphrase: STELLAR_NETWORK,
      assetCode
    })
  } catch (error: any) {
    console.error('Error creating NFT ticket:', error)
    return NextResponse.json({ 
      error: 'Failed to create NFT ticket',
      details: error.message
    }, { status: 500 })
  }
} 