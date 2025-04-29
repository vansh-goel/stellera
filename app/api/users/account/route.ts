import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import mongoose from 'mongoose';

// Define User schema if it doesn't exist elsewhere
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true },
  displayName: { type: String },
  email: { type: String },
});

// Get or create model
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Find user by wallet address
    const user = await User.findOne({ 
      walletAddress 
    }).select('username walletAddress displayName _id');
    
    if (!user) {
      // If user doesn't exist yet, return the wallet address only
      return NextResponse.json({ 
        user: {
          walletAddress,
          username: `user_${walletAddress.substring(0, 8)}`, // Generate temporary username
          displayName: `User ${walletAddress.substring(0, 8)}...`,
          _id: walletAddress // Use wallet address as ID for now
        }
      });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error retrieving user details:', error);
    return NextResponse.json({ error: 'Failed to retrieve user details' }, { status: 500 });
  }
} 