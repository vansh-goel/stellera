import { createContext, useContext, useState, ReactNode } from 'react';
import { Keypair } from '@stellar/stellar-sdk';

interface WalletContextType {
  publicKey: string;
  signTransaction: (transactionXDR: string, networkPassphrase: string) => Promise<string>;
  setPublicKey: (key: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string>('');

  const signTransaction = async (transactionXDR: string, networkPassphrase: string) => {
    // In a real implementation, this would use the user's secret key
    // For now, we'll just return the unsigned transaction
    return transactionXDR;
  };

  return (
    <WalletContext.Provider value={{ publicKey, signTransaction, setPublicKey }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 