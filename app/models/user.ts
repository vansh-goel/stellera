import mongoose, { Schema } from 'mongoose';

// Define the User schema
const userSchema = new Schema({
  username: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  displayName: String,
  stellarAddress: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: {
    type: String,
    sparse: true,
    unique: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create and export the model
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 