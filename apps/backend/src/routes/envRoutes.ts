import { Router } from 'express';
import EnvVar from '../models/EnvVar.js';

const router = Router();

// Mock storage for environment variables
let mockEnvVars: any[] = [];

// Get all env vars for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (process.env.MOCK_MODE === 'true') {
      return res.json(mockEnvVars.filter(v => v.projectId === projectId));
    }

    const vars = await EnvVar.find({ projectId });
    res.json(vars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch environment variables' });
  }
});

// Add or update an env var
router.post('/:projectId', async (req, res) => {
  try {
    const { key, value } = req.body;
    const { projectId } = req.params;
    console.log(`Saving env var for project ${projectId}: ${key}`);

    if (process.env.MOCK_MODE === 'true') {
      const existingIndex = mockEnvVars.findIndex(v => v.projectId === projectId && v.key === key);
      const newVar = { _id: Math.random().toString(36).substr(2, 9), projectId, key, value, createdAt: new Date() };
      
      if (existingIndex > -1) {
        mockEnvVars[existingIndex] = { ...mockEnvVars[existingIndex], value };
        return res.json(mockEnvVars[existingIndex]);
      } else {
        mockEnvVars.push(newVar);
        return res.json(newVar);
      }
    }

    const envVar = await EnvVar.findOneAndUpdate(
      { projectId, key },
      { value },
      { upsert: true, new: true }
    );

    res.json(envVar);
  } catch (error: any) {
    console.error('EnvVar Save Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save environment variable' });
  }
});

// Delete an env var
router.delete('/:projectId/:key', async (req, res) => {
  try {
    const { projectId, key } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      mockEnvVars = mockEnvVars.filter(v => !(v.projectId === projectId && v.key === key));
      return res.json({ message: 'Variable deleted' });
    }

    await EnvVar.findOneAndDelete({ projectId, key });
    res.json({ message: 'Variable deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete variable' });
  }
});

export default router;
