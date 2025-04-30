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
 * POST /api/tickets/create
 * 
 * Creates an NFT ticket asset on the Stellar blockchain
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
      ipfsHash
    } = body
    
    console.log("Create ticket request:", body)
    
    if (!publicKey || !eventName) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Generate a unique asset code for the NFT ticket based on the event name
    // Stellar only allows up to 12 characters
    // Format the name in a more recognizable way
    const cleanName = eventName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const baseCode = cleanName.substring(0, 6)
    const uniqueId = Math.floor(Math.random() * 100000).toString()
    const assetCode = (baseCode + uniqueId).substring(0, 12)
    
    console.log("Generated asset code:", assetCode)
    
    try {
      // Connect to the Stellar network
      const server = new Horizon.Server(HORIZON_URL)
      
      // Load the issuer account
      console.log("Loading account:", publicKey)
      const issuerAccount = await server.loadAccount(publicKey)
      console.log("Account loaded successfully")
      
      // Create the NFT asset
      const ticketAsset = new Asset(assetCode, publicKey)
      console.log("Created ticket asset:", assetCode, publicKey)
      
      // Build transaction to issue NFT tickets
      console.log("Building transaction...")
      const transaction = new TransactionBuilder(issuerAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_NETWORK
      })
      
      // Add the IPFS hash as memo (if available)
      if (ipfsHash) {
        // Extract just the hash part if it's a full URL
        const hashPart = ipfsHash.includes('ipfs://') 
          ? ipfsHash.replace('ipfs://', '') 
          : ipfsHash;
        
        // Use a hash that's short enough for the memo
        const memoText = hashPart.substring(0, 28);
        transaction.addMemo(Memo.text(memoText));
        console.log("Added IPFS hash to memo:", memoText);
      }
      
      // Create payment to self with the NFT asset (this is how assets are created on Stellar)
      // For NFTs, we typically use a very small amount per ticket
      const nftAmount = "0.0000001" // Minimum amount for each NFT
      
      // Calculate total supply
      const totalAmount = (parseFloat(nftAmount) * (totalSupply || 100)).toFixed(7);
      
      console.log("Creating NFT asset with payment operation:", {
        asset: `${assetCode}:${publicKey}`,
        amount: totalAmount,
        destination: publicKey
      });
      
      // Add the payment operation to create and issue the asset
      transaction.addOperation(
        Operation.payment({
          destination: publicKey, // Payment to self to establish the asset
          asset: ticketAsset,     // The NFT asset
          amount: totalAmount     // Total amount of tokens to create
        })
      );
      
      // Add metadata using manageData operations
      transaction.addOperation(
        Operation.manageData({
          name: 'event_name',
          value: eventName.substring(0, 64) // Max size for manage data value
        })
      );
      
      if (eventDate) {
        transaction.addOperation(
          Operation.manageData({
            name: 'event_date',
            value: eventDate.substring(0, 64)
          })
        );
      }
      
      if (eventLocation) {
        transaction.addOperation(
          Operation.manageData({
            name: 'event_location',
            value: eventLocation.substring(0, 64)
          })
        );
      }
      
      if (ticketPrice) {
        transaction.addOperation(
          Operation.manageData({
            name: 'ticket_price',
            value: ticketPrice.toString().substring(0, 64)
          })
        );
      }
      
      // Set asset type to ticket with manage data
      transaction.addOperation(
        Operation.manageData({
          name: 'asset_type',
          value: 'nft_ticket'
        })
      );
      
      // Set timeout and build
      transaction.setTimeout(30);
      const builtTransaction = transaction.build();
      
      console.log("Transaction built successfully");
      
      // Return the transaction XDR for signing by the client
      return NextResponse.json({
        success: true,
        transactionXDR: builtTransaction.toXDR(),
        networkPassphrase: STELLAR_NETWORK,
        assetCode,
        eventName,
        eventDate,
        eventLocation,
        ticketPrice
      })
    } catch (error: any) {
      console.log('Error creating NFT ticket:', error)
      let errorMessage = 'Failed to create NFT ticket'
      
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
    console.log('Error in ticket creation handler:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error.message
    }, { status: 500 })
  }
} 