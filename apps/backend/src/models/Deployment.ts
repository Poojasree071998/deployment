import mongoose, { Schema, Document } from 'mongoose';

export interface IDeployment extends Document {
  projectId: mongoose.Types.ObjectId;
  status: 'pending' | 'cloning' | 'building' | 'deploying' | 'deployed' | 'failed';
  logs: { timestamp: Date; message: string; type: 'info' | 'error' }[];
  containerId?: string;
  url?: string;
  port?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeploymentSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'cloning', 'building', 'deploying', 'deployed', 'failed'],
    default: 'pending' 
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    type: { type: String, enum: ['info', 'error'], default: 'info' }
  }],
  containerId: { type: String },
  url: { type: String },
  port: { type: Number }
}, { timestamps: true });

export default mongoose.model<IDeployment>('Deployment', DeploymentSchema);
