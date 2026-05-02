import { simpleGit } from 'simple-git';
import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Deployment from '../models/Deployment.js';
import EnvVar from '../models/EnvVar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docker = new Docker();

import axios from 'axios';

/**
 * Helper to update deployment status and add logs to MongoDB
 */
const updateDeployment = async (id: string, status: string, message: string, type: 'info' | 'error' = 'info') => {
  console.log(`[${status.toUpperCase()}] ${message}`);
  
  const log = { timestamp: new Date(), message, type };

  try {
    // 1. Persist to DB
    await Deployment.findByIdAndUpdate(id, {
      $set: { status },
      $push: { logs: log }
    });

    // 2. Relay for Real-time streaming
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000/api';
    await axios.post(`${backendUrl}/webhooks/log`, {
      deploymentId: id,
      log,
      status
    }).catch(() => {}); // Ignore relay errors to not break build

  } catch (err) {
    console.error('Failed to update deployment in DB:', err);
  }
};

export const executeBuild = async (data: any) => {
  const { deploymentId, projectId, gitUrl, name, subdomain } = data;
  const buildPath = path.join(__dirname, '../../builds', deploymentId);

  try {
    if (!fs.existsSync(buildPath)) {
      fs.mkdirSync(buildPath, { recursive: true });
    }

    const git = simpleGit(buildPath);

    // 1. Clone
    await updateDeployment(deploymentId, 'cloning', `Cloning repository: ${gitUrl}`);
    await git.clone(gitUrl, '.');

    // 2. Detect Framework (Simplified)
    const files = fs.readdirSync(buildPath);
    let framework = 'static';
    if (files.includes('package.json')) {
      const pkg = JSON.parse(fs.readFileSync(path.join(buildPath, 'package.json'), 'utf8'));
      if (pkg.dependencies?.next || pkg.devDependencies?.next) framework = 'nextjs';
      else if (pkg.dependencies?.react || pkg.devDependencies?.react) framework = 'react';
    }
    await updateDeployment(deploymentId, 'building', `Detected framework: ${framework}. Starting build...`);

    // 3. Create Dockerfile if not exists
    const dockerfilePath = path.join(buildPath, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      const dockerfileContent = generateDockerfile(framework);
      fs.writeFileSync(dockerfilePath, dockerfileContent);
    }

    // 4. Build Image
    const imageName = `${name.toLowerCase()}`;
    const imageTag = `${imageName}:${deploymentId}`;
    
    await updateDeployment(deploymentId, 'building', `Building Docker image: ${imageTag}`);
    
    const stream = await docker.buildImage({
      context: buildPath,
      src: fs.readdirSync(buildPath)
    }, { t: imageTag });

    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err, res) => {
        if (err) return reject(err);
        // Optionally parse stream for detailed build logs
        resolve(res);
      });
    });

    // 5. Push to Registry (Optional - enabled if credentials exist)
    if (process.env.REGISTRY_USER && process.env.REGISTRY_PASSWORD) {
      const registryUrl = process.env.REGISTRY_URL || 'docker.io';
      const remoteTag = `${process.env.REGISTRY_USER}/${imageName}:${deploymentId}`;
      
      await updateDeployment(deploymentId, 'deploying', `Pushing image to registry: ${remoteTag}`);
      
      const image = docker.getImage(imageTag);
      await image.tag({ repo: `${process.env.REGISTRY_USER}/${imageName}`, tag: deploymentId });
      
      const pushStream = await docker.getImage(remoteTag).push({
        authconfig: {
          username: process.env.REGISTRY_USER,
          password: process.env.REGISTRY_PASSWORD,
          serveraddress: registryUrl
        }
      });

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(pushStream, (err, res) => err ? reject(err) : resolve(res));
      });
      await updateDeployment(deploymentId, 'deploying', `Successfully pushed to registry.`);
    }

    // 6. Run Container locally
    await updateDeployment(deploymentId, 'deploying', `Fetching environment variables...`);
    const envVars = await EnvVar.find({ projectId });
    const envStrings = envVars.map((v: any) => `${v.key}=${v.value}`);

    await updateDeployment(deploymentId, 'deploying', `Starting container locally...`);
    
    // Remove existing container with same name if it exists
    try {
      const existingContainer = docker.getContainer(`${name}-latest`);
      await existingContainer.stop();
      await existingContainer.remove();
    } catch (e) {}

    const container = await docker.createContainer({
      Image: imageTag,
      name: `${name}-latest`,
      Env: envStrings,
      HostConfig: {
        PublishAllPorts: true,
        RestartPolicy: { Name: 'always' }
      }
    });

    await container.start();
    const containerData = await container.inspect();
    const port = containerData.NetworkSettings.Ports['3000/tcp']?.[0]?.HostPort;

    await updateDeployment(deploymentId, 'deployed', `Successfully deployed! App is running.`);
    
    // 7. Generate Nginx Config for the user
    try {
      const { generateNginxConfig } = await import('./nginxService.js');
      generateNginxConfig(name, subdomain, parseInt(port));
    } catch (e) {}

    // 8. Update GitHub status to Success
    if (data.sha) {
      const { updateGitHubStatus } = await import('./githubStatusService.js');
      await updateGitHubStatus(gitUrl, data.sha, 'success', `http://${subdomain}.localhost`, 'Successfully deployed via Mini PaaS');
    }

    // Update deployment with URL/Port
    await Deployment.findByIdAndUpdate(deploymentId, {
      $set: { 
        url: `http://localhost:${port}`,
        port: parseInt(port),
        containerId: containerData.Id
      }
    });

  } catch (error: any) {
    await updateDeployment(deploymentId, 'failed', `Build failed: ${error.message}`, 'error');
    
    // Report Failure to GitHub
    if (data.sha) {
      try {
        const { updateGitHubStatus } = await import('./githubStatusService.js');
        await updateGitHubStatus(gitUrl, data.sha, 'failure', undefined, `Build failed: ${error.message}`);
      } catch (e) {}
    }

    console.error('Build failed:', error);
    throw error;
  }
};

function generateDockerfile(framework: string): string {
  switch (framework) {
    case 'nextjs':
      return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`;
    case 'react':
      return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]`;
    default:
      return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
  }
}
