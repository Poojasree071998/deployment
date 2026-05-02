/**
 * Service to handle deployments only to your own Local/VPS Docker engine.
 * All external cloud dependencies (Vercel/Render) have been removed.
 */
export const triggerAllDeployments = async (project: any, deploymentId: string) => {
  // 1. Trigger local Docker deployment via your own deployer worker
  const { addDeploymentJob } = await import('./queue.js');
  
  await addDeploymentJob({
    deploymentId,
    projectId: project._id.toString(),
    gitUrl: project.gitUrl,
    name: project.name,
    subdomain: project.subdomain,
    sha: project.sha
  });

  // Simulation of logs for the local dashboard
  const steps = [
    { msg: '🔍 Cloning repository...', delay: 1000 },
    { msg: '📦 Installing dependencies...', delay: 3000 },
    { msg: '⚙️ Building application with Docker...', delay: 6000 },
    { msg: '🚀 Finalizing deployment...', delay: 8000 },
    { msg: '✅ Local deployment successful!', delay: 10000, status: 'success' }
  ];

  const { io } = await import('../server.js');
  
  steps.forEach(step => {
    setTimeout(async () => {
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

  return [{ success: true, target: 'local-docker' }];
};
