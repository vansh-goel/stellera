import { NextRequest, NextResponse } from 'next/server'
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
  Asset,
  Memo
} from '@stellar/stellar-sdk'

const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET
const HORIZON_URL = process.env.STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org'

/**
 * POST /api/tickets/send
 * 
 * Sends an NFT ticket to a recipient on the Stellar blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      senderPublicKey, 
      recipientPublicKey,
      assetCode,
      assetIssuer,
      memo
    } = body
    
    if (!senderPublicKey || !recipientPublicKey || !assetCode || !assetIssuer) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Connect to the Stellar network
    const server = new Horizon.Server(HORIZON_URL)
    
    // Load the sender's account
    const senderAccount = await server.loadAccount(senderPublicKey)
    
    // Create the asset object for the NFT ticket
    const ticketAsset = new Asset(assetCode, assetIssuer)
    
    // Build transaction to send the NFT ticket
    const transaction = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK
    })
    
    // Check if recipient has a trustline for this asset
    let needsTrustline = false
    try {
      await server.loadAccount(recipientPublicKey)
      
      // Check if recipient has trustline for this asset
      const accountResponse = await server
        .accounts()
        .accountId(recipientPublicKey)
        .call()
      
      needsTrustline = !accountResponse.balances.some(balance => {
        if (balance.asset_type === 'native') return false
        
        // Check if this is a non-native asset with matching code and issuer
        return ('asset_code' in balance && 
                'asset_issuer' in balance && 
                balance.asset_code === assetCode && 
                balance.asset_issuer === assetIssuer)
      })
    } catch (error) {
      // If account doesn't exist, we'll need to create it
      needsTrustline = true
    }
    
    // Add payment operation to send the NFT ticket
    transaction.addOperation(
      Operation.payment({
        destination: recipientPublicKey,
        asset: ticketAsset,
        amount: '0.0000001' // Minimum amount for an NFT on Stellar
      })
    )
    
    // Add memo if provided
    if (memo) {
      transaction.addMemo(Memo.text(memo))
    }
    
    const builtTransaction = transaction.setTimeout(30).build()
    
    // Return the transaction XDR for signing by the client
    return NextResponse.json({
      success: true,
      transactionXDR: builtTransaction.toXDR(),
      networkPassphrase: STELLAR_NETWORK,
      needsTrustline
    })
  } catch (error: any) {
    console.log('Error sending NFT ticket:', error)
    return NextResponse.json({ 
      error: 'Failed to send NFT ticket',
      details: error.message
    }, { status: 500 })
  }
} 