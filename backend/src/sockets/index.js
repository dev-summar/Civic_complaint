const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        config.clientUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8081',
        'http://localhost:19006',
      ],
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.user = { id: decoded.sub || decoded.id || decoded.userId, role: decoded.role };
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
      if (socket.user.role) socket.join(`role:${socket.user.role}`);
    }

    logger.debug(`Socket connected: ${socket.id} user=${userId}`);

    socket.on('complaint:subscribe', (complaintId) => {
      if (complaintId) socket.join(`complaint:${complaintId}`);
    });

    socket.on('complaint:unsubscribe', (complaintId) => {
      if (complaintId) socket.leave(`complaint:${complaintId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

const getIO = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

const emitToComplaint = (complaintId, event, payload) => {
  if (!io) return;
  io.to(`complaint:${complaintId}`).emit(event, payload);
};

const emitToRole = (role, event, payload) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToComplaint, emitToRole };
