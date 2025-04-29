import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import Username from '@/app/models/username';

// GET: Search for usernames 
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ 
        error: 'Search query must be at least 2 characters' 
      }, { status: 400 });
    }

    // Search for usernames that start with the query (case insensitive)
    const usernames = await Username.find({
      username: { $regex: `^${query}`, $options: 'i' }
    }).limit(10).select('username publicKey -_id');

    return NextResponse.json({ 
      results: usernames 
    }, { status: 200 });
  } catch (error) {
    console.error('Error in username search:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 