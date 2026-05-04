# Deployment Guide: MERN Stack on Vercel + Render + MongoDB Atlas

This guide is kept as a reference for the standard cloud deployment flow. Our goal is to replicate and improve upon this workflow within our own independent PaaS infrastructure.

## Architecture Overview

┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Vercel    │ ───► │   Render    │ ───► │  MongoDB Atlas  │
│  (Frontend) │      │  (Backend)  │      │   (Database)    │
│  Next.js/   │      │  Node.js/   │      │                 │
│  React      │      │  Express    │      │                 │
└─────────────┘      └─────────────┘      └─────────────────┘

## Independent PaaS Equivalent
Our platform replaces these with:
1. **Frontend**: Local Docker Container + Nginx Reverse Proxy
2. **Backend**: Local Docker Container + Nginx Reverse Proxy
3. **Database**: "Mongo-by-Me" Isolated Docker Containers with Persistent Volumes

---

### Step 1: Set Up MongoDB Atlas
**Create a Cluster**
1. Go to [mongodb.com](https://mongodb.com) and sign up
2. Click **Build a Database**
3. Choose your tier:
   - Free (M0) — 512 MB storage, good for development
   - Flex — Pay-as-you-go, up to 5 GB
   - Dedicated — Production workloads
4. Select a cloud provider (AWS, GCP, or Azure) and region close to your users
5. Click **Create Cluster**

**Configure Access**
1. **Database User**: Go to Database Access → Add New Database User
   - Create a username and password
   - Grant Read and Write privileges
2. **Network Access**: Go to Network Access → Add IP Address
   - For development: Add your current IP
   - For production with Render/Vercel: Add `0.0.0.0/0` (allow all IPs) since these platforms use dynamic IPs
3. **Get Connection String**: Click Connect → Connect your application
   - Copy the connection string: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority`

### Step 2: Set Up Backend on Render
**Prepare Your Backend Code**
Create a simple Express server structure:
```
server/
├── src/
│   └── index.js
├── package.json
├── .env.example
└── Dockerfile (optional)
```

**package.json**:
```json
{
  "name": "server",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "mongoose": "^7.0.0"
  }
}
```

**src/index.js**:
```javascript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { config } from 'dotenv';
config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Your API routes here
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**Deploy to Render**
1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up
3. Click **New → Web Service**
4. Connect your GitHub repository
5. Configure the service:
   - Name: `my-backend`
   - Root Directory: `server` (if using monorepo)
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables:
   - `MONGODB_URI` = your Atlas connection string
   - `FRONTEND_URL` = your Vercel URL (add after deploying frontend)
7. Click **Create Web Service**

### Step 3: Set Up Frontend on Vercel
**Prepare Your Frontend Code**
```
client/
├── pages/
│   └── index.js
├── package.json
├── .env.local.example
└── next.config.js
```

**pages/index.js** (Next.js example):
```javascript
import { useEffect, useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hello`)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setMessage('Error connecting to backend'));
  }, []);

  return (
    <div>
      <h1>My App</h1>
      <p>{message}</p>
    </div>
  );
}
```

**Deploy to Vercel**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click **Add New → Project**
4. Import your GitHub repository
5. Configure:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `client` (if using monorepo)
6. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g., `https://my-backend.onrender.com`)
7. Click **Deploy**

### Step 4: Connect Everything
After both are deployed, update the CORS settings:
1. On Render: Add/update the `FRONTEND_URL` environment variable to your Vercel URL
2. Redeploy the backend on Render for changes to take effect

---

### Quick Reference: Environment Variables
| Platform | Variable | Value |
| :--- | :--- | :--- |
| Render | `MONGODB_URI` | MongoDB Atlas connection string |
| Render | `FRONTEND_URL` | `your-app.vercel.app` |
| Vercel | `NEXT_PUBLIC_API_URL` | `your-backend.onrender.com` |

### Common Issues & Fixes
- **Backend not connecting to MongoDB**: Verify you added `0.0.0.0/0` to Atlas Network Access.
- **CORS errors**: Ensure `FRONTEND_URL` on Render matches your exact Vercel domain.
- **Render free tier spinning down**: Free services sleep after 15 minutes of inactivity. First request takes ~30 seconds.
