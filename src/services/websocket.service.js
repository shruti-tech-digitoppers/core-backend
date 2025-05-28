import { Server } from 'socket.io';
import { handleWebSocketReports } from '../controllers/reports.controller.js';
import { License } from '../models/mongo.model.js';
import { decrypt } from '../utils/security.utils.js';

let io;

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Configure according to your needs
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const { apiKey, deviceId, offlineToken } = socket.handshake.auth;

      if (!apiKey || !deviceId || !offlineToken) {
        return next(new Error('Authentication failed'));
      }

      const license = await License.findOne({ apiKey });
      if (!license || license.registeredTo !== deviceId) {
        return next(new Error('Invalid license or device'));
      }

      // Decrypt and validate security parameters
      const securityParams = decrypt(license.securityParams, license.licenseKey);
      if (securityParams.offlineToken !== offlineToken) {
        return next(new Error('Invalid offline token'));
      }

      // Attach license to socket for later use
      socket.license = license;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle report syncing
    socket.on('syncReports', async (reports) => {
      await handleWebSocketReports(socket, reports);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}; 