import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createChangeTrustTransaction, submitTransaction } from "@/lib/stellar-transactions";
import { useWallet } from "@/app/providers/wallet-provider";
import { useToast } from "@/app/hooks/use-toast";
import { SignTransactionModal } from "./sign-transaction-modal";

interface ManageTrustlineProps {
  assetCode: string;
  assetIssuer: string;
  onSuccess?: () => void;
}

export function ManageTrustline({ assetCode, assetIssuer, onSuccess }: ManageTrustlineProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<{
    transaction: string;
    network_passphrase: string;
  } | null>(null);
  const { publicKey, sign } = useWallet();
  const { toast } = useToast();

  const handleAddTrustline = async () => {
    if (!publicKey) {
      toast({
        title: "Error",
        description: "No wallet connected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const transaction = await createChangeTrustTransaction({
        source: publicKey,
        asset: `${assetCode}:${assetIssuer}`,
        limit: undefined // undefined means add/maintain trustline
      });

      setPendingTransaction(transaction);
      setIsSignModalOpen(true);
    } catch (error) {
      console.error("Error creating trustline transaction:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trustline transaction",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTrustline = async () => {
    if (!publicKey) {
      toast({
        title: "Error",
        description: "No wallet connected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const transaction = await createChangeTrustTransaction({
        source: publicKey,
        asset: `${assetCode}:${assetIssuer}`,
        limit: "0" // "0" means remove trustline
      });

      setPendingTransaction(transaction);
      setIsSignModalOpen(true);
    } catch (error) {
      console.error("Error creating trustline transaction:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trustline transaction",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async (pincode: string) => {
    if (!pendingTransaction) return;

    try {
      setIsLoading(true);
      const signedTransaction = await sign({
        transactionXDR: pendingTransaction.transaction,
        network: pendingTransaction.network_passphrase,
        pincode
      });

      const submissionResult = await submitTransaction(signedTransaction);
      console.log("Transaction Submission Result:", submissionResult);
      
      toast({
        title: "Success",
        description: "Transaction submitted successfully",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error signing transaction:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign transaction",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSignModalOpen(false);
      setPendingTransaction(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Asset Code</Label>
          <Input value={assetCode} readOnly />
        </div>
        <div className="space-y-2">
          <Label>Issuer</Label>
          <Input value={assetIssuer} readOnly />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAddTrustline} 
            disabled={isLoading || !publicKey}
          >
            {isLoading ? "Processing..." : "Add Trustline"}
          </Button>
          <Button 
            variant="destructive"
            onClick={handleRemoveTrustline} 
            disabled={isLoading || !publicKey}
          >
            {isLoading ? "Processing..." : "Remove Trustline"}
          </Button>
        </div>
      </div>

      <SignTransactionModal
        isOpen={isSignModalOpen}
        onClose={() => {
          setIsSignModalOpen(false);
          setPendingTransaction(null);
        }}
        onConfirm={() => handleSign("")}
        title="Sign Trustline Transaction"
        description="Please enter your pincode to sign the trustline transaction"
      />
    </>
  );
} 