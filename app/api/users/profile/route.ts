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

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, displayName, email } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Find user by wallet address
    let user = await User.findOne({ walletAddress });
    
    if (!user) {
      // Create a temporary username if needed
      const tempUsername = `user_${walletAddress.substring(0, 8)}_${Date.now()}`;
      
      // Create new user
      user = new User({
        username: tempUsername,
        walletAddress,
        displayName: displayName || null,
        email: email || null
      });
    } else {
      // Update existing user
      if (displayName !== undefined) {
        user.displayName = displayName;
      }
      
      if (email !== undefined) {
        user.email = email;
      }
    }
    
    await user.save();
    
    return NextResponse.json({
      success: true,
      displayName: user.displayName,
      email: user.email
    });
  } catch (error) {
    console.log('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
} 