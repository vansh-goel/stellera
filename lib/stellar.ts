import { Wallet, StellarConfiguration, ApplicationConfiguration, DefaultSigner } from '@stellar/typescript-wallet-sdk';
import axios, { AxiosInstance } from 'axios';

// Create a custom axios instance with timeout
const customClient: AxiosInstance = axios.create({
  timeout: 10000, // 10 seconds timeout
});

// Configure the application
const appConfig = new ApplicationConfiguration(DefaultSigner, customClient);

// Create a singleton wallet instance
let wallet: Wallet | null = null;

export function getWallet(): Wallet {
  if (!wallet) {
    wallet = new Wallet({
      stellarConfiguration: StellarConfiguration.TestNet(), // Using Testnet for development
      applicationConfiguration: appConfig,
    });
  }
  return wallet;
}

// Helper function to get the Stellar instance
export function getStellar() {
  return getWallet().stellar();
}

// Helper function to get an anchor instance
export function getAnchor(homeDomain: string, allowHttp: boolean = false) {
  return getWallet().anchor({ homeDomain, allowHttp });
}

// Export types for better type safety
export type { Wallet, StellarConfiguration }; 