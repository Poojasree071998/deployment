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
  const { deploymentId, projectId, gitUrl, name, subdomain, projectType, envVars = [] } = data;
  const buildPath = path.join(__dirname, '../../builds', deploymentId);

  try {
    if (!fs.existsSync(buildPath)) {
      fs.mkdirSync(buildPath, { recursive: true });
    }

    const git = simpleGit(buildPath);

    // 1. Clone
    await updateDeployment(deploymentId, 'cloning', `Cloning repository: ${gitUrl}`);
    await git.clone(gitUrl, '.');

    // 2. Framework Detection / override by type
    let framework = 'static';
    const files = fs.readdirSync(buildPath);
    
    if (projectType === 'frontend') {
      if (files.includes('package.json')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(buildPath, 'package.json'), 'utf8'));
        if (pkg.dependencies?.next || pkg.devDependencies?.next) framework = 'nextjs';
        else if (pkg.dependencies?.react || pkg.devDependencies?.react || pkg.devDependencies?.vite) framework = 'react';
      }
    } else if (projectType === 'backend') {
      framework = 'nodejs';
    } else {
      // Auto-detect if not specified
      if (files.includes('package.json')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(buildPath, 'package.json'), 'utf8'));
        if (pkg.dependencies?.next || pkg.devDependencies?.next) framework = 'nextjs';
        else if (pkg.dependencies?.react || pkg.devDependencies?.react) framework = 'react';
        else framework = 'nodejs';
      }
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
        resolve(res);
      });
    });

    // 5. Run Container locally
    await updateDeployment(deploymentId, 'deploying', `Setting up environment...`);
    const envStrings = envVars.map((v: any) => `${v.key}=${v.value}`);

    // Default ports based on framework
    let internalPort = 3000;
    if (framework === 'nodejs') internalPort = 5000;
    if (framework === 'react' || framework === 'vite') internalPort = 80;

    await updateDeployment(deploymentId, 'deploying', `Starting container locally...`);
    
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
    
    // Find the host port mapped to the internal port
    const portMapping = containerData.NetworkSettings.Ports[`${internalPort}/tcp`];
    const port = portMapping ? portMapping[0].HostPort : Object.values(containerData.NetworkSettings.Ports)[0][0].HostPort;

    await updateDeployment(deploymentId, 'deployed', `Successfully deployed! App is running on port ${port}`);
    
    // 6. Generate Nginx Config
    try {
      const { generateNginxConfig } = await import('./nginxService.js');
      generateNginxConfig(name, subdomain, parseInt(port));
    } catch (e) {}

    // Update deployment with URL/Port
    await Deployment.findByIdAndUpdate(deploymentId, {
      $set: { 
        url: `http://${subdomain}.localhost`, // Simplified for local dev
        port: parseInt(port),
        containerId: containerData.Id
      }
    });

  } catch (error: any) {
    await updateDeployment(deploymentId, 'failed', `Build failed: ${error.message}`, 'error');
    console.error('Build failed:', error);
    throw error;
  }
};

function generateDockerfile(framework: string): string {
  switch (framework) {
    case 'nextjs':
      return `FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]`;
    case 'react':
    case 'vite':
      return `FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
    case 'nodejs':
      return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]`;
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
