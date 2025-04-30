import mongoose from 'mongoose';

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// This is a simplified connection caching approach
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return mongoose;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log('Connected to MongoDB');
    return mongoose;
  } catch (error) {
    console.log('MongoDB connection error:', error);
    throw error;
  }
}

export default connectToDatabase; 