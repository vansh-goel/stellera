import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import { Notification } from '@/app/lib/models/notification';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const recipient = searchParams.get('recipient');
    
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient parameter is required' }, { status: 400 });
    }
    
    // Make sure to await the database connection before querying
    const mongoose = await connectToDatabase();
    
    // Find dues notifications (where the user needs to pay)
    const duesNotifications = await Notification.find({
      recipient,
      type: { $in: ['split_bill', 'payment_request'] },
      read: false // Only show unread/unpaid notifications
    }).sort({ createdAt: -1 });
    
    // Find history of paid notifications
    const paidNotifications = await Notification.find({
      recipient,
      type: 'payment_sent'
    }).sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      dues: duesNotifications,
      paid: paidNotifications
    });
  } catch (error) {
    console.error('Error retrieving dues notifications:', error);
    return NextResponse.json({ error: 'Failed to retrieve dues notifications' }, { status: 500 });
  }
} 