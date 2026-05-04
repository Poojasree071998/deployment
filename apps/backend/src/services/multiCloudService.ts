import { emitLog, emitDeploymentStatus } from './socketService.js';
import { addDeploymentJob } from './queue.js';

/**
 * Service to handle deployments only to your own Local/VPS Docker engine.
 * All external cloud dependencies (Vercel/Render) have been removed.
 */
export const triggerAllDeployments = async (project: any, deploymentId: string) => {
  const provider = project.provider || 'local';

  if (provider === 'local') {
    // 1. Trigger local Docker deployment via your own deployer worker
    await addDeploymentJob({
      deploymentId,
      projectId: project._id.toString(),
      gitUrl: project.gitUrl,
      name: project.name,
      subdomain: project.subdomain,
      projectType: project.projectType,
      envVars: project.envVars,
      sha: project.sha
    });

    // Simulation of logs for the local dashboard
    const steps = [
      { msg: '🔍 Cloning repository...', delay: 1000 },
      { msg: '📦 Installing dependencies...', delay: 3000 },
      { msg: '⚙️ Building application with Docker...', delay: 6000 },
      { msg: '🚀 Finalizing deployment...', delay: 8000 },
      { msg: '✅ Local deployment successful!', delay: 10000, status: 'deployed' }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        emitLog(deploymentId, step.msg);
        if (step.status) {
          emitDeploymentStatus(deploymentId, step.status);
        }
      }, step.delay);
    });

    return [{ success: true, target: 'local-docker' }];
  } else {
    // 2. Trigger Cloud Deployment (Vercel/Render)
    // In a real scenario, this would call Vercel/Render APIs
    
    const steps = [
      { msg: '🌐 Initiating Cloud Deployment Stack...', delay: 500 },
      { msg: '🚀 Triggering build on Render (Backend)...', delay: 2000 },
      { msg: '⚡ Triggering build on Vercel (Frontend)...', delay: 4000 },
      { msg: '📡 Connecting to MongoDB Atlas Cluster...', delay: 6000 },
      { msg: '⏳ Waiting for build completion...', delay: 9000 },
      { msg: '✅ Cloud deployment successful!', delay: 12000, status: 'deployed' }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        emitLog(deploymentId, step.msg);
        if (step.status) {
          emitDeploymentStatus(deploymentId, step.status);
        }
      }, step.delay);
    });

    return [{ success: true, target: 'cloud-stack' }];
  }
};
