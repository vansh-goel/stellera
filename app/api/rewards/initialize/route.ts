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

// Constants for SLR token - imported from the main rewards route
const SLR_ASSET_CODE = "SLR"
const SEED_PHRASE = `${process.env.NEXT_PUBLIC_SEED_PHRASE}`
const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET
const HORIZON_URL = process.env.STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org'
const FRIENDBOT_URL = "https://friendbot.stellar.org"

// Function to derive keypair from seed phrase
function getKeypairFromSeedPhrase(seedPhrase: string, index = 0): Keypair {
  const seed = mnemonicToSeedSync(seedPhrase)
  const derivedSeed = derivePath(`m/44'/148'/${index}'`, seed.toString('hex')).key
  return Keypair.fromRawEd25519Seed(derivedSeed)
}

/**
 * POST /api/rewards/initialize
 * 
 * One-time function to initialize the SLR token
 * This should be run only once to set up the issuing account and create the token
 */
export async function POST(request: NextRequest) {
  try {
    // Get issuer keypair from seed phrase
    const issuerKeypair = getKeypairFromSeedPhrase(SEED_PHRASE)
    
    // Create a destination keypair (optional, for testing)
    const destinationKeypair = Keypair.random()
    
    console.log(`Issuer public key: ${issuerKeypair.publicKey()}`)
    console.log(`Test destination public key: ${destinationKeypair.publicKey()}`)
    
    // Check if we're in testnet, and if so, fund the accounts using friendbot
    if (STELLAR_NETWORK === Networks.TESTNET) {
      try {
        // Fund the issuer account if it doesn't exist yet
        const fundIssuerResponse = await fetch(`${FRIENDBOT_URL}?addr=${issuerKeypair.publicKey()}`)
        if (!fundIssuerResponse.ok) {
          console.log('Issuer account may already be funded (or friendbot error)')
        } else {
          console.log('Successfully funded issuer account with friendbot')
        }
        
        // Fund the destination account (for testing only)
        const fundDestResponse = await fetch(`${FRIENDBOT_URL}?addr=${destinationKeypair.publicKey()}`)
        if (!fundDestResponse.ok) {
          console.log('Destination account may already be funded (or friendbot error)')
        } else {
          console.log('Successfully funded destination account with friendbot')
        }
      } catch (error) {
        console.log('Error funding accounts with friendbot:', error)
      }
    }
    
    // Connect to the Stellar network
    const server = new Horizon.Server(HORIZON_URL)
    
    // Load the issuer account
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey())
    
    // Create the SLR asset
    const slrAsset = new Asset(SLR_ASSET_CODE, issuerKeypair.publicKey())
    
    // Build a transaction to establish a trustline for the destination account and send initial tokens
    const transaction = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        Operation.changeTrust({
          asset: slrAsset,
          source: destinationKeypair.publicKey(),
        }),
      )
      .addOperation(
        Operation.payment({
          destination: destinationKeypair.publicKey(),
          asset: slrAsset,
          amount: "100", // Send 100 SLR tokens as a test
        }),
      )
      .setTimeout(30)
      .build()
    
    // Sign the transaction with both keypairs
    transaction.sign(issuerKeypair, destinationKeypair)
    
    // Submit the transaction
    const result = await server.submitTransaction(transaction)
    
    return NextResponse.json({
      success: true,
      message: 'SLR token successfully initialized',
      issuerPublicKey: issuerKeypair.publicKey(),
      testDestinationPublicKey: destinationKeypair.publicKey(),
      transactionHash: result.hash,
      stellarExplorerLink: `https://stellar.expert/explorer/${STELLAR_NETWORK === Networks.PUBLIC ? 'public' : 'testnet'}/tx/${result.hash}`
    })
  } catch (error: any) {
    console.log('Error initializing SLR token:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initialize SLR token',
      details: error.response?.data || error
    }, { status: 500 })
  }
} 