import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import Username from '@/app/models/username';

// GET: Check if a username exists or resolve a username to a public key
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const publicKey = searchParams.get('publicKey');

    // If username is provided, resolve to public key
    if (username) {
      const usernameDoc = await Username.findOne({ username: username.toLowerCase() });
      if (!usernameDoc) {
        return NextResponse.json({ available: true }, { status: 200 });
      }
      return NextResponse.json({ 
        available: false, 
        publicKey: usernameDoc.publicKey 
      }, { status: 200 });
    }

    // If public key is provided, get the associated username
    if (publicKey) {
      const usernameDoc = await Username.findOne({ publicKey });
      if (!usernameDoc) {
        return NextResponse.json({ exists: false }, { status: 200 });
      }
      return NextResponse.json({ 
        exists: true, 
        username: usernameDoc.username 
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Missing username or publicKey parameter' }, { status: 400 });
  } catch (error) {
    console.log('Error in username GET:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Register a new username
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { username, publicKey } = body;

    if (!username || !publicKey) {
      return NextResponse.json({ error: 'Username and publicKey are required' }, { status: 400 });
    }

    // Check if username format is valid
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores' 
      }, { status: 400 });
    }

    // Check if username already exists
    const existingUsername = await Username.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Check if public key already has a username
    const existingPublicKey = await Username.findOne({ publicKey });
    if (existingPublicKey) {
      return NextResponse.json({ 
        error: 'This public key already has a username',
        existingUsername: existingPublicKey.username
      }, { status: 409 });
    }

    // Create new username entry
    const newUsername = new Username({
      username: username.toLowerCase(),
      publicKey,
    });

    await newUsername.save();

    return NextResponse.json({ 
      success: true, 
      username: newUsername.username 
    }, { status: 201 });
  } catch (error) {
    console.log('Error in username POST:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT: Update an existing username
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { currentUsername, newUsername, publicKey } = body;

    if (!publicKey) {
      return NextResponse.json({ error: 'publicKey is required' }, { status: 400 });
    }

    if (!newUsername) {
      return NextResponse.json({ error: 'newUsername is required' }, { status: 400 });
    }

    // Check if the public key belongs to the user making the request
    const existingUser = await Username.findOne({ publicKey });
    if (!existingUser) {
      return NextResponse.json({ error: 'No username found for this public key' }, { status: 404 });
    }

    // Check if new username is available
    if (existingUser.username !== newUsername.toLowerCase()) {
      const existingUsername = await Username.findOne({ username: newUsername.toLowerCase() });
      if (existingUsername) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
    }

    // Check if new username format is valid
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores' 
      }, { status: 400 });
    }

    // Update username
    existingUser.username = newUsername.toLowerCase();
    await existingUser.save();

    return NextResponse.json({ 
      success: true, 
      username: existingUser.username 
    }, { status: 200 });
  } catch (error) {
    console.log('Error in username PUT:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: Remove a username
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const publicKey = searchParams.get('publicKey');

    if (!publicKey) {
      return NextResponse.json({ error: 'publicKey is required' }, { status: 400 });
    }

    // Find and delete the username entry
    const result = await Username.findOneAndDelete({ publicKey });
    
    if (!result) {
      return NextResponse.json({ error: 'No username found for this public key' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Username successfully removed' 
    }, { status: 200 });
  } catch (error) {
    console.log('Error in username DELETE:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 