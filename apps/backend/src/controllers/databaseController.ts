import { Request, Response } from 'express';
import Docker from 'dockerode';
import Database from '../models/Database.js';

const docker = new Docker();

export const createDatabase = async (req: Request, res: Response) => {
  const { name } = req.body;

  try {
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
    provisionMongo(db.id, name, port);

    res.status(201).json(db);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDatabases = async (req: Request, res: Response) => {
  try {
    const dbs = await Database.find().sort({ createdAt: -1 });
    res.json(dbs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDatabase = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await Database.findById(id);
    if (!db) return res.status(404).json({ error: 'Database not found' });

    // Stop and Remove Container
    if (db.containerId) {
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
    // Pull image if not exists
    await docker.pull('mongo:latest');

    const container = await docker.createContainer({
      Image: 'mongo:latest',
      name: `paas-db-${name}`,
      HostConfig: {
        PortBindings: {
          '27017/tcp': [{ HostPort: port.toString() }]
        },
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

  } catch (error: any) {
    console.error('Provisioning failed:', error);
    await Database.findByIdAndUpdate(dbId, { status: 'failed' });
  }
}
