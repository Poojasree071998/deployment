import { Router } from 'express';
import { deployProject, getProjectsInternal } from '../controllers/projectController.js';
import crypto from 'crypto';

const router = Router();

/**
 * GitHub Webhook Handler
 * Triggers automatic deployments when a push event is received.
 */
router.post('/github', async (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-hub-signature-256'] as string;
  // 2. Extract repo URL from GitHub payload
  let repoUrl = payload.repository?.clone_url || payload.repository?.html_url;
  
  if (!repoUrl) {
    return res.status(400).json({ error: 'Invalid payload: No repository URL found' });
  }

  const normalizedRepoUrl = repoUrl.replace(/\.git$/, '').toLowerCase();
  console.log('📦 GitHub Webhook received for:', normalizedRepoUrl);

  // 3. Find the project matching this repo
  const projects = await getProjectsInternal();
  const project = projects.find(p => {
    const projectUrl = p.gitUrl.replace(/\.git$/, '').toLowerCase();
    return projectUrl === normalizedRepoUrl;
  });

  if (!project) {
    console.log('⚠️ GitHub Webhook: No matching project found for', normalizedRepoUrl);
    return res.status(200).json({ message: 'No matching project found' });
  }

  // 3.5 Branch Verification
  const pushBranch = payload.ref?.replace('refs/heads/', '');
  const projectBranch = project.branch || 'main';

  if (pushBranch && pushBranch !== projectBranch) {
    console.log(`ℹ️ GitHub Webhook: Push to ${pushBranch} ignored (Project branch: ${projectBranch})`);
    return res.status(200).json({ message: `Ignored push to ${pushBranch}` });
  }

  // 4. Security Verification (Per-Project)
  const projectSecret = project.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;
  if (projectSecret && signature) {
    const hmac = crypto.createHmac('sha256', projectSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
    
    if (signature !== digest) {
      console.error('❌ GitHub Webhook: Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  console.log(`🚀 Automatic Deployment: Push detected on ${project.name} (${projectBranch})`);
    
    // Create mock objects to reuse controller logic
    const mockReq = { params: { projectId: project._id } } as any;
    const mockRes = { 
      status: () => ({ json: () => {}, send: () => {} }), 
      json: (data: any) => console.log('Deployment Triggered:', data) 
    } as any;
    
    await deployProject(mockReq, mockRes);
    return res.status(200).json({ message: 'Deployment triggered successfully' });

  console.log('⚠️ GitHub Webhook: No matching project found for', normalizedRepoUrl);
  res.status(200).json({ message: 'No matching project found' });
});

// Real-time log relay for the deployer
router.post('/log', async (req, res) => {
  const { deploymentId, log, status } = req.body;
  const { io } = await import('../server.js');

  if (log) {
    io.emit('log', { deploymentId, log });
  }

  if (status) {
    io.emit('deployment-status', { deploymentId, status });
  }

  res.status(200).json({ ok: true });
});

export default router;
