import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { executeBuild } from './services/buildService.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paas-platform';

// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

if (process.env.MOCK_MODE === 'true') {
  console.log('🏗️ Deployer running in MOCK_MODE: Worker disabled.');
} else {
  const worker = new Worker('deployment-queue', async (job: Job) => {
    console.log(`Processing job ${job.id} for project ${job.data.name}`);
    
    try {
      await executeBuild(job.data);
      console.log(`Successfully completed job ${job.id}`);
    } catch (error) {
      console.error(`Failed job ${job.id}:`, error);
      throw error;
    }
  }, {
    connection: {
      url: REDIS_URL
    }
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`${job?.id} has failed with ${err.message}`);
  });
}
