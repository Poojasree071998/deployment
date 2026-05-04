import { Request, Response } from 'express';
import Docker from 'dockerode';
import Database from '../models/Database.js';
import { emitDatabaseStatus } from '../services/socketService.js';
import path from 'path';
import fs from 'fs';

const docker = new Docker();

// Ensure storage directory for databases exists
const DB_STORAGE_PATH = path.join(process.cwd(), 'data', 'databases');
if (!fs.existsSync(DB_STORAGE_PATH)) {
  fs.mkdirSync(DB_STORAGE_PATH, { recursive: true });
}

// Persistent Mock Storage for databases
const DB_MOCK_STORAGE = path.join(process.cwd(), 'data', 'mock-databases.json');

const loadMockDB = () => {
  if (fs.existsSync(DB_MOCK_STORAGE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_MOCK_STORAGE, 'utf8'));
    } catch (e) { return []; }
  }
  return [];
};

const saveMockDB = (dbs: any[]) => {
  fs.writeFileSync(DB_MOCK_STORAGE, JSON.stringify(dbs, null, 2));
};

let mockDatabases: any[] = loadMockDB();

export const createDatabase = async (req: Request, res: Response) => {
  const { name } = req.body;

  try {
    if (process.env.MOCK_MODE === 'true') {
      const latestDB = [...mockDatabases].sort((a, b) => b.port - a.port)[0];
      const port = latestDB ? latestDB.port + 1 : 27018;
      
      const db = {
        _id: Math.random().toString(36).substr(2, 9),
        name,
        port,
        status: 'creating',
        createdAt: new Date()
      };
      mockDatabases.push(db);
      saveMockDB(mockDatabases);
      provisionMongo(db._id, name, port);
      return res.status(201).json(db);
    }

    // 1. Find a unique port (starting from 27018 to avoid conflict with main DB)
    const latestDB = await Database.findOne().sort({ port: -1 });
    const port = latestDB ? latestDB.port + 1 : 27018;

    // 2. Create DB Record
    const db = await Database.create({
      name,
      port,
      status: 'creating'
    });

    // 3. Start Docker Container (Asynchronous)
    provisionMongo(db.id as string, name, port);

    res.status(201).json(db);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDatabases = async (req: Request, res: Response) => {
  try {
    if (process.env.MOCK_MODE === 'true') {
      return res.json([...mockDatabases].sort((a, b) => b.createdAt - a.createdAt));
    }
    const dbs = await Database.find().sort({ createdAt: -1 });
    res.json(dbs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDatabase = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (process.env.MOCK_MODE === 'true') {
      mockDatabases = mockDatabases.filter(d => d._id !== id);
      saveMockDB(mockDatabases);
      return res.json({ message: 'Database deleted' });
    }
    const db = await Database.findById(id);
    if (!db) return res.status(404).json({ error: 'Database not found' });

    // Stop and Remove Container
    if (db.containerId && process.env.MOCK_MODE !== 'true') {
      try {
        const container = docker.getContainer(db.containerId);
        await container.stop();
        await container.remove();
      } catch (e) {
        console.error('Failed to remove container:', e);
      }
    }

    await Database.findByIdAndDelete(id);
    res.json({ message: 'Database deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

async function provisionMongo(dbId: string, name: string, port: number) {
  try {
    console.log(`[DB] Starting provisioning for ${name} on port ${port}...`);

    if (process.env.MOCK_MODE === 'true') {
      const connectionString = `mongodb://localhost:${port}/${name}`;
      
      const dbs = loadMockDB();
      const updatedDbs = dbs.map((d: any) => 
        d._id === dbId ? { ...d, status: 'running', connectionString } : d
      );
      saveMockDB(updatedDbs);
      
      // Update the local cache as well
      mockDatabases = updatedDbs;

      emitDatabaseStatus(dbId, 'running', connectionString);
      console.log(`[DB] Mock provisioning complete for ${name}`);
      return;
    }

    // 1. Pull image if not exists
    await new Promise((resolve, reject) => {
      docker.pull('mongo:latest', (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err: any, output: any) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
    });

    // 2. Prepare storage path
    const dbPath = path.join(DB_STORAGE_PATH, name);
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    const containerName = `paas-db-${name}`;

    // 3. Remove existing container if it exists (cleanup)
    try {
      const existing = docker.getContainer(containerName);
      await existing.remove({ force: true });
    } catch (e) {}

    // 4. Create and Start Container
    const container = await docker.createContainer({
      Image: 'mongo:latest',
      name: containerName,
      HostConfig: {
        PortBindings: {
          '27017/tcp': [{ HostPort: port.toString() }]
        },
        Binds: [`${dbPath}:/data/db`],
        RestartPolicy: { Name: 'always' }
      }
    });

    await container.start();

    const connectionString = `mongodb://localhost:${port}/${name}`;

    await Database.findByIdAndUpdate(dbId, {
      status: 'running',
      containerId: container.id,
      connectionString
    });

    // Notify frontend via Socket.io
    emitDatabaseStatus(dbId, 'running', connectionString);
    console.log(`[DB] Provisioning successful for ${name}`);

  } catch (error: any) {
    console.error(`[DB] Provisioning failed for ${name}:`, error);
    if (process.env.MOCK_MODE === 'true') {
      mockDatabases = mockDatabases.map(d => 
        d._id === dbId ? { ...d, status: 'failed' } : d
      );
    } else {
      await Database.findByIdAndUpdate(dbId, { status: 'failed' });
    }
    emitDatabaseStatus(dbId, 'failed');
  }
}
