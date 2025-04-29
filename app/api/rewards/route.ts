import { NextRequest, NextResponse } from 'next/server'
import {
  Horizon,
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
} from '@stellar/stellar-sdk'
import { mnemonicToSeedSync } from 'bip39'
import { derivePath } from 'ed25519-hd-key'

// Constants for SLR token
const SLR_ASSET_CODE = "SLR"
const SEED_PHRASE = "sleep amused either hurry once pulp pill airport volume giraffe napkin state prepare minute subway grid orchard whale monitor neither advance harsh apart define"
const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET
const HORIZON_URL = process.env.STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org'

// Function to derive keypair from seed phrase
function getKeypairFromSeedPhrase(seedPhrase: string, index = 0): Keypair {
  const seed = mnemonicToSeedSync(seedPhrase)
  const derivedSeed = derivePath(`m/44'/148'/${index}'`, seed.toString('hex')).key
  return Keypair.fromRawEd25519Seed(derivedSeed)
}

// Get issuer keypair from seed phrase
const issuerKeypair = getKeypairFromSeedPhrase(SEED_PHRASE)
const SLR_ISSUER_WALLET = issuerKeypair.publicKey()

// In a real application, you would use a database to store reward records
// For this demo, we'll use an in-memory store
const rewardRecords: Record<string, { 
  totalXlmSpent: number,
  slrIssued: number,
  transactions: Array<{
    txHash: string,
    xlmAmount: number, 
    slrAmount: number,
    timestamp: string
  }>
}> = {}

/**
 * GET /api/rewards
 * 
 * Returns reward information for a user
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get('wallet')
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
  }
  
  try {
    // Get reward record or create new one if it doesn't exist
    const rewardRecord = rewardRecords[walletAddress] || {
      totalXlmSpent: 0,
      slrIssued: 0,
      transactions: []
    }
    
    return NextResponse.json({
      wallet: walletAddress,
      totalXlmSpent: rewardRecord.totalXlmSpent,
      slrIssued: rewardRecord.slrIssued,
      transactions: rewardRecord.transactions,
      earnedSLR: Math.floor(rewardRecord.totalXlmSpent / 100) // 1 SLR per 100 XLM
    })
  } catch (error) {
    console.error('Error getting rewards:', error)
    return NextResponse.json({ error: 'Failed to get rewards' }, { status: 500 })
  }
}

/**
 * Issue SLR tokens to a specified wallet address
 */
async function issueSLRTokens(destination: string, amount: number): Promise<string> {
  try {
    // Use the keypair derived from seed phrase
    const slrAsset = new Asset(SLR_ASSET_CODE, SLR_ISSUER_WALLET)
    
    // Connect to the Stellar network
    const server = new Horizon.Server(HORIZON_URL)
    
    // Load issuer account
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey())
    
    // First, ensure the destination has a trustline for our SLR token
    // This is a necessary step before sending custom assets
    try {
      const destAccount = await server.loadAccount(destination)
      
      // Create and build the transaction
      const transaction = new TransactionBuilder(issuerAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_NETWORK
      })
        .addOperation(Operation.payment({
          destination: destination,
          asset: slrAsset,
          amount: amount.toString()
        }))
        .setTimeout(30)
        .build()
      
      // Sign and submit transaction
      transaction.sign(issuerKeypair)
      const result = await server.submitTransaction(transaction)
      
      return result.hash
    } catch (error) {
      console.error('Error issuing SLR tokens:', error)
      throw new Error(`Failed to issue tokens: ${error}`)
    }
  } catch (error) {
    console.error('Error in SLR token issuance process:', error)
    throw error
  }
}

/**
 * POST /api/rewards
 * 
 * Tracks XLM spending and issues SLR tokens if needed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, txHash, xlmAmount, description } = body
    
    if (!walletAddress || !txHash || !xlmAmount) {
      return NextResponse.json({ 
        error: 'Wallet address, transaction hash, and XLM amount are required' 
      }, { status: 400 })
    }
    
    // Get reward record or create new one
    if (!rewardRecords[walletAddress]) {
      rewardRecords[walletAddress] = {
        totalXlmSpent: 0,
        slrIssued: 0,
        transactions: []
      }
    }
    
    const record = rewardRecords[walletAddress]
    
    // Update XLM spent
    record.totalXlmSpent += parseFloat(xlmAmount)
    
    // Calculate earned SLR
    const earnedSLR = Math.floor(record.totalXlmSpent / 100) // 1 SLR per 100 XLM
    
    // Calculate SLR to issue
    const slrToIssue = earnedSLR - record.slrIssued
    
    // Add transaction record
    record.transactions.push({
      txHash,
      xlmAmount: parseFloat(xlmAmount),
      slrAmount: slrToIssue,
      timestamp: new Date().toISOString()
    })
    
    // If there's SLR to issue, create a payment transaction
    let issueTxHash = null
    if (slrToIssue > 0) {
      try {
        // Issue tokens and get transaction hash
        issueTxHash = await issueSLRTokens(walletAddress, slrToIssue)
        
        // Update our records with the successful issuance
        record.slrIssued += slrToIssue
        
        // Update the transaction record with the issuance tx hash
        const lastTx = record.transactions[record.transactions.length - 1]
        lastTx.txHash = issueTxHash
      } catch (error) {
        console.error('Failed to issue SLR tokens:', error)
        // In a production app, you might want to queue this for retry
      }
    }
    
    return NextResponse.json({
      success: true,
      walletAddress,
      xlmTracked: xlmAmount,
      slrIssued: slrToIssue,
      totalXlmSpent: record.totalXlmSpent,
      totalSlrIssued: record.slrIssued,
      issueTxHash
    })
  } catch (error) {
    console.error('Error tracking rewards:', error)
    return NextResponse.json({ error: 'Failed to process rewards' }, { status: 500 })
  }
} 