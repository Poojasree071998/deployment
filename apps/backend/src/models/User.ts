import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  googleId?: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  googleId: { type: String },
  avatar: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
