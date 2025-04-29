import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
  Horizon
} from "@stellar/stellar-sdk";

// Network configuration

const maxFeePerOperation = "100000"; // Current recommended fee is 100,000 stroops
var server = new Horizon.Server(
  "https://horizon-testnet.stellar.org",
);
const networkPassphrase = Networks.TESTNET;
const standardTimebounds = 300; // 5 minutes for the user to review/sign/submit

/**
 * Creates a change trust transaction to establish a trustline for an asset
 */
export async function createChangeTrustTransaction({ 
  source, 
  asset, // In format "CODE:ISSUER"
  limit // undefined to add/maintain trustline, "0" to remove
}: {
  source: string;
  asset: string;
  limit?: string;
}) {
  console.log("Creating change trust transaction with params:", { source, asset, limit });
  
  // Convert asset string to Stellar Asset object
  const [assetCode, assetIssuer] = asset.split(":");
  console.log("Parsed asset:", { assetCode, assetIssuer });
  
  const trustAsset = new Asset(assetCode, assetIssuer);
  console.log("Created trust asset:", trustAsset);

  // Initialize transaction
  console.log("Loading source account:", source);
  const sourceAccount = await server.loadAccount(source);
  console.log("Source account loaded:", sourceAccount);

  console.log("Building transaction with:", {
    networkPassphrase,
    fee: maxFeePerOperation,
    sourceAccount: sourceAccount.accountId()
  });

  const transaction = new TransactionBuilder(sourceAccount, {
    networkPassphrase: networkPassphrase,
    fee: maxFeePerOperation,
  })
    .addOperation(
      Operation.changeTrust({
        asset: trustAsset,
        limit: limit?.toString(),
      }),
    )
    .setTimeout(standardTimebounds)
    .build();

  console.log("Transaction built successfully:", {
    sequence: transaction.sequence,
    operations: transaction.operations,
    fee: transaction.fee,
    timeBounds: transaction.timeBounds
  });

  return {
    transaction: transaction.toXDR(),
    network_passphrase: networkPassphrase,
  };
}

/**
 * Creates a payment transaction
 */
export async function createPaymentTransaction({ 
  source, 
  destination, 
  amount, 
  asset = "native", // Default is XLM (native asset)
  memo = ""
}: {
  source: string;
  destination: string;
  amount: string;
  asset?: string;
  memo?: string;
}) {
  console.log("Creating payment transaction with params:", { 
    source, 
    destination, 
    amount, 
    asset, 
    memo 
  });

  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  // Initialize transaction
  console.log("Loading source account:", source);
  const sourceAccount = await server.loadAccount(source);
  console.log("Source account loaded:", sourceAccount);
  
  console.log("Building transaction with:", {
    networkPassphrase,
    fee: maxFeePerOperation,
    sourceAccount: sourceAccount.accountId()
  });

  let txBuilder = new TransactionBuilder(sourceAccount, {
    networkPassphrase: networkPassphrase,
    fee: maxFeePerOperation,
  });

  // Add payment operation
  let sendAsset;
  if (asset === "native" || asset.toLowerCase() === "xlm") {
    console.log("Adding native asset payment operation");
    sendAsset = Asset.native();
  } else {
    console.log("Adding custom asset payment operation");
    const [assetCode, assetIssuer] = asset.split(":");
    if (!assetCode || !assetIssuer) {
      throw new Error("Invalid asset format. Expected format: CODE:ISSUER");
    }
    console.log("Parsed asset:", { assetCode, assetIssuer });
    sendAsset = new Asset(assetCode, assetIssuer);
  }

  // Add payment operation
  txBuilder = txBuilder.addOperation(
    Operation.payment({
      destination,
      asset: sendAsset,
      amount: amount.toString(),
    })
  );

  // Add memo if provided
  if (memo) {
    console.log("Adding memo:", memo);
    txBuilder = txBuilder.addMemo(Memo.text(memo));
  }

  // Build transaction
  const transaction = txBuilder.setTimeout(standardTimebounds).build();

  console.log("Transaction built successfully:", {
    sequence: transaction.sequence,
    operations: transaction.operations,
    fee: transaction.fee,
    timeBounds: transaction.timeBounds,
    memo: transaction.memo
  });

  return {
    transaction: transaction.toXDR(),
    network_passphrase: networkPassphrase,
  };
}

/**
 * Submits a signed transaction XDR to the Stellar network
 */
export async function submitTransaction(signedTransactionXDR: string) {
  try {
    const transaction = TransactionBuilder.fromXDR(signedTransactionXDR, networkPassphrase);
    return await server.submitTransaction(transaction);
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
}