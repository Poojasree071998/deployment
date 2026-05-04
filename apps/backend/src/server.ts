import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import projectRoutes from './routes/projectRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import envRoutes from './routes/envRoutes.js';
import authRoutes from './routes/authRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import { initSocket } from './services/socketService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    methods: ['GET', 'POST']
  }
});

initSocket(io);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paas-platform';
mongoose.set('bufferCommands', false); // Disable buffering to prevent timeouts when DB is offline

if (process.env.MOCK_MODE === 'true') {
  console.log('🚀 Running in MOCK_MODE: No MongoDB required.');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
      console.error('MongoDB connection error. Switching to MOCK_MODE...');
      process.env.MOCK_MODE = 'true';
    });
}

app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/env', envRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/platform', platformRoutes);

app.get('/success', (req, res) => {
  const appName = req.query.app || 'Your App';
  res.send(`
    <html>
      <head>
        <title>Success | ${appName}</title>
        <style>
          body { background: #050505; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 3rem; rounded: 2rem; text-align: center; border-radius: 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
          h1 { font-size: 3rem; margin-bottom: 0.5rem; background: linear-gradient(to right, #5833ff, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          p { color: #888; font-size: 1.2rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 ${appName}</h1>
          <p>Your application has been successfully deployed to the cloud!</p>
          <p style="font-size: 0.9rem; opacity: 0.5; margin-top: 2rem;">Powered by Mini PaaS</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>PaaS Engine | Active</title>
        <style>
          body { background: #050505; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 4rem; border-radius: 3rem; text-align: center; box-shadow: 0 40px 100px rgba(0,0,0,0.8); max-width: 600px; }
          .icon { font-size: 5rem; margin-bottom: 2rem; }
          h1 { font-size: 3.5rem; margin-bottom: 1rem; background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; letter-spacing: -2px; }
          p { color: #888; font-size: 1.2rem; line-height: 1.6; }
          .status { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(34, 197, 94, 0.1); color: #22c55e; padding: 0.5rem 1.5rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; margin-top: 2rem; border: 1px solid rgba(34, 197, 94, 0.2); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🚀</div>
          <h1>PaaS Engine</h1>
          <p>Your private infrastructure control plane is <b>Live</b> and listening for deployments.</p>
          <div class="status">● System Operational</div>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
