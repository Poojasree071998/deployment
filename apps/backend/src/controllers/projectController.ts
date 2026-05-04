import { Request, Response } from 'express';
import Project from '../models/Project.js';
import Deployment from '../models/Deployment.js';
import { addDeploymentJob } from '../services/queue.js';
import { RepoValidator } from '../services/repoValidator.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { triggerAllDeployments } from '../services/multiCloudService.js';

// Persistent Mock Storage for MOCK_MODE
const MOCK_STORAGE_PATH = path.join(process.cwd(), 'data', 'mock-store.json');
if (!fs.existsSync(path.dirname(MOCK_STORAGE_PATH))) {
  fs.mkdirSync(path.dirname(MOCK_STORAGE_PATH), { recursive: true });
}

const loadMockData = () => {
  if (fs.existsSync(MOCK_STORAGE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MOCK_STORAGE_PATH, 'utf8'));
    } catch (e) {
      return { projects: [], deployments: [] };
    }
  }
  return { projects: [], deployments: [] };
};

const saveMockData = (projects: any[], deployments: any[]) => {
  fs.writeFileSync(MOCK_STORAGE_PATH, JSON.stringify({ projects, deployments }, null, 2));
};

let { projects: mockProjects, deployments: mockDeployments } = loadMockData();

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, gitUrl, subdomain, provider, branch } = req.body;
    // @ts-ignore
    const userId = req.user?.id || '60d0fe4f5311236168a109ca'; // Fallback for dev

    if (process.env.MOCK_MODE === 'true') {
      const newMockProject = {
        _id: Math.random().toString(36).substr(2, 9),
        name,
        gitUrl,
        subdomain,
        userId,
        provider: provider || 'local',
        branch: branch || 'main',
        status: 'active',
        webhookSecret: crypto.randomBytes(16).toString('hex'),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockProjects.unshift(newMockProject);
      saveMockData(mockProjects, mockDeployments);
      console.log('Mock Project created:', name);
      return res.status(201).json(newMockProject);
    }

    const project = new Project({
      name,
      gitUrl,
      subdomain,
      userId,
      provider: provider || 'local',
      branch: branch || 'main',
      webhookSecret: crypto.randomBytes(16).toString('hex')
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const validateRepo = async (req: Request, res: Response) => {
  try {
    const { url, token } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const details = await RepoValidator.validate(url, token);
    res.json(details);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deployProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { sha } = req.body; // Extract SHA passed from webhook
    
    if (process.env.MOCK_MODE === 'true') {
      const project = mockProjects.find(p => p._id === projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const deploymentId = Math.random().toString(36).substr(2, 9);
      const newMockDeployment = {
        _id: deploymentId,
        projectId,
        status: 'pending',
        url: `http://localhost:5000/success?app=${project.name}`,
        logs: [{ timestamp: new Date(), message: 'Starting deployment...' }],
        createdAt: new Date()
      };
      mockDeployments.unshift(newMockDeployment);
      saveMockData(mockProjects, mockDeployments);

      // Use the centralized simulation logic
      await triggerAllDeployments({ ...project, sha }, deploymentId);

      return res.status(202).json(newMockDeployment);
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const deployment = new Deployment({
      projectId: project._id,
      status: 'pending'
    });

    await deployment.save();

    await triggerAllDeployments({ ...project.toObject(), sha }, deployment._id.toString());

    res.status(202).json(deployment);
  } catch (error) {
    console.error('[DEPLOY] Trigger Error:', error);
    res.status(500).json({ error: 'Failed to trigger deployment' });
  }
};

export const getProjectsInternal = async () => {
  if (process.env.MOCK_MODE === 'true') {
    return mockProjects;
  }
  return await Project.find();
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await getProjectsInternal();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getDeployments = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    if (process.env.MOCK_MODE === 'true') {
      return res.json(mockDeployments.filter(d => d.projectId === projectId));
    }
    const deployments = await Deployment.find({ projectId }).sort({ createdAt: -1 });
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    if (process.env.MOCK_MODE === 'true') {
      const index = mockProjects.findIndex(p => p._id === projectId);
      if (index > -1) {
        mockProjects.splice(index, 1);
        mockDeployments = mockDeployments.filter(d => d.projectId !== projectId);
        saveMockData(mockProjects, mockDeployments);
      }
      return res.status(204).send();
    }
    await Project.findByIdAndDelete(projectId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
