import { Schema, model } from 'mongoose';

const WaitlistSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    source: { type: String },
  },
  { timestamps: true }
);

export const WaitlistModel = model('Waitlist', WaitlistSchema);
