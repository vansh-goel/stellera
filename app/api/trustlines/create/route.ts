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
 * POST /api/trustlines/create
 * 
 * Creates a trustline for an asset on the Stellar blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      publicKey, 
      assetCode,
      assetIssuer
    } = body
    
    console.log("Create trustline request:", body)
    
    if (!publicKey || !assetCode || !assetIssuer) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    try {
      // Connect to the Stellar network
      const server = new Horizon.Server(HORIZON_URL)
      
      // Load the account
      console.log("Loading account:", publicKey)
      const account = await server.loadAccount(publicKey)
      console.log("Account loaded successfully")
      
      // Check if trustline already exists
      const existingTrustline = account.balances.some(balance => {
        if (balance.asset_type === 'native') return false
        return ('asset_code' in balance && 
                'asset_issuer' in balance && 
                balance.asset_code === assetCode && 
                balance.asset_issuer === assetIssuer)
      })
      
      if (existingTrustline) {
        return NextResponse.json({
          success: true,
          message: "Trustline already exists"
        })
      }
      
      // Create the asset object
      const asset = new Asset(assetCode, assetIssuer)
      
      // Build transaction to create trustline
      console.log("Building transaction for trustline creation...")
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_NETWORK
      })
      
      // Add changeTrust operation
      transaction.addOperation(
        Operation.changeTrust({
          asset,
          limit: '1000000000' // A high limit, user can hold up to this much
        })
      )
      
      // Set timeout and build
      transaction.setTimeout(30)
      const builtTransaction = transaction.build()
      
      console.log("Trustline transaction built successfully")
      
      // Return the transaction XDR for signing by the client
      return NextResponse.json({
        success: true,
        transactionXDR: builtTransaction.toXDR(),
        networkPassphrase: STELLAR_NETWORK,
        message: "Trustline transaction created successfully"
      })
    } catch (error: any) {
      console.log('Error creating trustline:', error)
      let errorMessage = 'Failed to create trustline'
      
      if (error.response) {
        console.log('Response error data:', error.response.data)
        
        if (error.response.data.extras && error.response.data.extras.result_codes) {
          errorMessage = `Transaction error: ${JSON.stringify(error.response.data.extras.result_codes)}`
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: error.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.log('Error in trustline creation handler:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error.message
    }, { status: 500 })
  }
} 