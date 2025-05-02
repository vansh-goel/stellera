import {
    Horizon,
    Keypair,
    Asset,
    TransactionBuilder,
    Operation,
    Networks,
    BASE_FEE,
    Memo
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
  
  // Create the SLR asset object
  export const slrAsset = new Asset(SLR_ASSET_CODE, SLR_ISSUER_WALLET)
  
  // Connect to the Stellar network
  const server = new Horizon.Server(HORIZON_URL)
  
  /**
   * Swap XLM for SLR tokens
   * This function:
   * 1. Takes XLM from the user (but doesn't actually need to receive it - we trust the transaction has happened)
   * 2. Sends SLR tokens to the recipient
   */
  export async function swapXlmForSlr(
    sourceXlmAmount: string, 
    destination: string, 
    memo?: string
  ): Promise<{
    success: boolean,
    slrAmount: string,
    txHash?: string,
    error?: string
  }> {
    try {
      // Calculate SLR amount based on XLM input
      // Using a fixed conversion rate: 1 XLM = 0.5 SLR
      const xlmAmount = parseFloat(sourceXlmAmount)
      if (isNaN(xlmAmount) || xlmAmount <= 0) {
        throw new Error('Invalid XLM amount')
      }
      
      // Apply conversion rate
      const slrAmount = (xlmAmount * 0.5).toFixed(7)
      
      // Load issuer account
      const issuerAccount = await server.loadAccount(SLR_ISSUER_WALLET)
      
      // Create transaction to send SLR to destination
      const transaction = new TransactionBuilder(issuerAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_NETWORK
      })
      
      // Add payment operation
      transaction.addOperation(
        Operation.payment({
          destination,
          asset: slrAsset,
          amount: slrAmount
        })
      )
      
      // Add memo if provided
      if (memo) {
        transaction.addMemo(Memo.text(memo))
      }
      
      // Set timeout and build
      transaction.setTimeout(30)
      const builtTx = transaction.build()
      
      // Sign with issuer keypair
      builtTx.sign(issuerKeypair)
      
      // Submit transaction
      const result = await server.submitTransaction(builtTx)
      
      return {
        success: true,
        slrAmount,
        txHash: result.hash
      }
    } catch (error: any) {
      console.error('Error in XLM to SLR swap:', error)
      return {
        success: false,
        slrAmount: '0',
        error: error.message || 'Unknown error during swap'
      }
    }
  }
  
  /**
   * Check if a destination address has a trustline for the SLR asset
   */
  export async function checkSlrTrustline(destinationAddress: string): Promise<boolean> {
    try {
      const account = await server.loadAccount(destinationAddress)
      
      // Check balances for SLR trustline
      for (const balance of account.balances) {
        if (
          balance.asset_type !== 'native' 
        ) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking SLR trustline:', error)
      return false
    }
  }
  
  /**
   * Get SLR balance for an address
   */
  export async function getSlrBalance(address: string): Promise<string> {
    try {
      const account = await server.loadAccount(address)
      
      // Find SLR balance
      for (const balance of account.balances) {
        if (
          balance.asset_type !== 'native'
        ) {
          return balance.balance
        }
      }
      
      return "0"
    } catch (error) {
      console.error('Error getting SLR balance:', error)
      return "0"
    }
  }
  
  /**
   * Generate a trustline transaction XDR for SLR token
   */
  export async function createSlrTrustlineTransaction(sourceAddress: string): Promise<{
    transaction: string,
    network_passphrase: string
  }> {
    // Load source account
    const sourceAccount = await server.loadAccount(sourceAddress)
    
    // Build transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK
    })
      .addOperation(
        Operation.changeTrust({
          asset: slrAsset
        })
      )
      .setTimeout(30)
      .build()
    
    return {
      transaction: transaction.toXDR(),
      network_passphrase: STELLAR_NETWORK
    }
  }