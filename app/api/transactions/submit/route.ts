import { NextRequest, NextResponse } from 'next/server'
import { Horizon, Networks, xdr, Transaction } from '@stellar/stellar-sdk'

const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET
const HORIZON_URL = process.env.STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org'

/**
 * POST /api/transactions/submit
 * 
 * Submits a signed transaction to the Stellar network
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signedXdr } = body
    
    if (!signedXdr) {
      return NextResponse.json({ 
        error: 'Missing signed transaction XDR' 
      }, { status: 400 })
    }
    
    console.log("Submitting transaction XDR:", signedXdr);
    
    // Connect to the Stellar network
    const server = new Horizon.Server(HORIZON_URL)
    
    try {
      // Submit the transaction directly using the XDR string
      const submitResponse = await fetch(`${HORIZON_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `tx=${encodeURIComponent(signedXdr)}`
      });
      
      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        console.log("Transaction submission error from Horizon:", errorData);
        throw new Error(errorData.title || "Error submitting transaction");
      }
      
      const transactionResult = await submitResponse.json();
      console.log("Transaction submission success:", transactionResult);
      
      // Return the transaction results
      return NextResponse.json({
        success: true,
        hash: transactionResult.hash,
        ledger: transactionResult.ledger,
        created_at: transactionResult.created_at || new Date().toISOString(),
        envelope_xdr: transactionResult.envelope_xdr
      });
    } catch (submitError: any) {
      console.log("Transaction submission error:", submitError);
      
      // Format error response
      const errorResponse = {
        error: submitError.message || "Failed to submit transaction",
        details: submitError.message,
        extras: submitError.extras || {}
      };
      
      return NextResponse.json(errorResponse, { status: 400 });
    }
  } catch (error: any) {
    console.log('Error in transaction submission handler:', error)
    
    return NextResponse.json({ 
      error: "Transaction submission failed",
      details: error.message
    }, { status: 500 })
  }
} 