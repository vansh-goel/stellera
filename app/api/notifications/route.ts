import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import { Notification } from '@/app/lib/models/notification';

// Get notifications for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const recipient = searchParams.get('recipient');
    
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient parameter is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const notifications = await Notification.find({ 
      recipient 
    }).sort({ createdAt: -1 }).limit(30);
    
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    return NextResponse.json({ error: 'Failed to retrieve notifications' }, { status: 500 });
  }
}

// Create a new notification
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    await connectToDatabase();
    
    const notification = await Notification.create(data);
    
    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Notification IDs array is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    await Notification.updateMany(
      { _id: { $in: ids } },
      { $set: { read: true } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
} 