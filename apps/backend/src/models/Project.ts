import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  gitUrl: string;
  subdomain: string;
  userId: mongoose.Types.ObjectId;
  framework: string;
  buildPath: string;
  provider: 'local' | 'vercel' | 'render';
  branch: string;
  externalId?: string;
  webhookSecret?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  gitUrl: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  framework: { type: String, default: 'detect' },
  buildPath: { type: String },
  provider: { type: String, enum: ['local', 'vercel', 'render'], default: 'local' },
  branch: { type: String, default: 'main' },
  externalId: { type: String },
  webhookSecret: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
