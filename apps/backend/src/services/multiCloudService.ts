import axios from 'axios';
import Deployment from '../models/Deployment.js';

/**
 * Service to handle deployments to multiple targets simultaneously
 */
export const triggerAllDeployments = async (project: any, deploymentId: string) => {
  const deployments = [];

  // 1. Always trigger local mock deployment for the dashboard
  const { addDeploymentJob } = await import('./queue.js');
  deployments.push(
    addDeploymentJob({
      deploymentId,
      projectId: project._id.toString(),
      gitUrl: project.gitUrl,
      name: project.name,
      subdomain: project.subdomain
    })
  );

  // Simulation of logs for the local dashboard
  const steps = [
    { msg: '🔍 Cloning repository...', delay: 1000 },
    { msg: '📦 Installing dependencies...', delay: 3000 },
    { msg: '⚙️ Building application...', delay: 6000 },
    { msg: '🚀 Finalizing deployment...', delay: 8000 },
    { msg: '✅ Local deployment successful!', delay: 10000, status: 'success' }
  ];

  steps.forEach(step => {
    setTimeout(async () => {
      const { io } = await import('../server.js');
      io.emit('log', { 
        deploymentId, 
        log: step.msg,
        timestamp: new Date() 
      });
      if (step.status) {
        io.emit('deployment-status', { deploymentId, status: step.status });
      }
    }, step.delay);
  });

  // 2. Trigger Vercel if token exists
  if (process.env.VERCEL_TOKEN) {
    deployments.push(deployToVercel(project, deploymentId).catch(e => console.error('Vercel Deploy Failed:', e.message)));
  }

  // 3. Trigger Render if API key exists
  if (process.env.RENDER_API_KEY) {
    deployments.push(deployToRender(project, deploymentId).catch(e => console.error('Render Deploy Failed:', e.message)));
  }

  return await Promise.all(deployments);
};

const deployToVercel = async (project: any, deploymentId: string) => {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is not configured');

  await updateDeploymentStatus(deploymentId, 'deploying', 'Triggering build on Vercel...');

  // Note: This is a simplified version. A real integration would use the Vercel API
  // to create a deployment from a Git source.
  const response = await axios.post('https://api.vercel.com/v13/deployments', {
    name: project.name,
    gitSource: {
      type: 'github',
      repoId: project.gitUrl.split('/').slice(-2).join('/'), // Simplified repo ID extraction
      ref: 'main'
    }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  await updateDeploymentStatus(deploymentId, 'deployed', 'Vercel build triggered successfully!');
  
  if (process.env.MOCK_MODE !== 'true') {
    await Deployment.findByIdAndUpdate(deploymentId, {
      url: `https://${response.data.url}`,
      externalId: response.data.id
    });
  }

  return response.data;
};

const deployToRender = async (project: any, deploymentId: string) => {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = project.externalId; // Render requires a pre-existing service ID
  
  if (!apiKey) throw new Error('RENDER_API_KEY is not configured');
  if (!serviceId) throw new Error('Render Service ID is not configured for this project');

  await updateDeploymentStatus(deploymentId, 'deploying', 'Triggering deploy on Render...');

  const response = await axios.post(`https://api.render.com/v1/services/${serviceId}/deploys`, {}, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  await updateDeploymentStatus(deploymentId, 'deployed', 'Render deploy triggered successfully!');
  
  return response.data;
};

const updateDeploymentStatus = async (id: string, status: string, message: string) => {
  if (process.env.MOCK_MODE === 'true') {
    console.log(`[MOCK STATUS] ${id}: ${status} - ${message}`);
    return;
  }
  await Deployment.findByIdAndUpdate(id, {
    $set: { status },
    $push: { logs: { timestamp: new Date(), message } }
  });
};
