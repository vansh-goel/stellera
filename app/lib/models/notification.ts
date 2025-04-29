import mongoose, { Schema } from 'mongoose';

export interface NotificationInterface {
  recipient: string;
  type: 'split_bill' | 'payment_request' | 'payment_received' | 'payment_sent';
  amount: number;
  asset: string;
  issuerWallet: string;
  issuerName: string;
  expenseId?: string;
  description: string;
  read: boolean;
  createdAt: Date;
  txHash?: string; // Transaction hash for blockchain payments
  status?: 'pending' | 'paid' | 'failed'; // Payment status
}

const NotificationSchema = new Schema<NotificationInterface>({
  recipient: { type: String, required: true },
  type: { type: String, required: true, enum: ['split_bill', 'payment_request', 'payment_received', 'payment_sent'] },
  amount: { type: Number, required: true },
  asset: { type: String, required: true, default: 'XLM' },
  issuerWallet: { type: String, required: true },
  issuerName: { type: String, required: true },
  expenseId: { type: String },
  description: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  txHash: { type: String },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema); 