import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export let deploymentQueue: any = null;

if (process.env.MOCK_MODE !== 'true') {
  deploymentQueue = new Queue('deployment-queue', {
    connection: {
      url: REDIS_URL
    }
  });
}

export const addDeploymentJob = async (data: any) => {
  if (process.env.MOCK_MODE === 'true') {
    return { id: 'mock-job-' + Date.now() };
  }

  return await deploymentQueue.add('deploy', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
};
