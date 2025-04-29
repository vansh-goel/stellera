import mongoose, { Schema } from 'mongoose';

// Define the interface
export interface IUsername {
  username: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const usernameSchema = new Schema<IUsername>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_]{3,20}$/, // Alphanumeric, underscore, 3-20 chars
    },
    publicKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Create and export the model
const Username = mongoose.models.Username || mongoose.model<IUsername>('Username', usernameSchema);

export default Username; 