import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import { Notification } from '@/app/lib/models/notification';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const data = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }
    
    const mongoose = await connectToDatabase();
    
    const notification = await Notification.findByIdAndUpdate(
      id, 
      { ...data }, 
      { new: true }
    );
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Notification updated successfully',
      notification 
    });
  } catch (error) {
    console.log('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
} 