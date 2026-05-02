import mongoose, { Schema, Document } from 'mongoose';

export interface IEnvVar extends Document {
  projectId: mongoose.Types.ObjectId;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnvVarSchema: Schema = new Schema({
  projectId: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { timestamps: true });

EnvVarSchema.index({ projectId: 1, key: 1 }, { unique: true });

export default mongoose.model<IEnvVar>('EnvVar', EnvVarSchema);
