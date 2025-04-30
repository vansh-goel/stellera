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
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json({ users: [] });
    }
    
    await connectToDatabase();
    
    // Search for users by username (partial match)
    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    }).limit(10).select('username walletAddress displayName');
    
    return NextResponse.json({ users });
  } catch (error) {
    console.log('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
} 