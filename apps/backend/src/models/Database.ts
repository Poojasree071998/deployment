import mongoose from 'mongoose';

const databaseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, default: 'mongodb' },
  status: { type: String, enum: ['creating', 'running', 'stopped', 'failed'], default: 'creating' },
  port: { type: Number, required: true },
  containerId: { type: String },
  connectionString: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Database', databaseSchema);
