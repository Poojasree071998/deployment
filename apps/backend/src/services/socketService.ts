import { Server } from 'socket.io';

let io: Server;

export const initSocket = (server: Server) => {
  io = server;
};

export const emitLog = (deploymentId: string, message: string) => {
  if (io) {
    io.emit('log', { 
      deploymentId, 
      log: message,
      timestamp: new Date() 
    });
  }
};

export const emitDeploymentStatus = (deploymentId: string, status: string) => {
  if (io) {
    io.emit('deployment-status', { deploymentId, status });
  }
};

export const emitDatabaseStatus = (dbId: string, status: string, connectionString?: string) => {
  if (io) {
    io.emit('database-status', { dbId, status, connectionString });
  }
};
