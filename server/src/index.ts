import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleConnection } from './socket-handlers.js';
import { pikafishPool } from './pikafish.js';

const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

io.on('connection', (socket) => handleConnection(io, socket));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`Server on :${PORT}`);
  try {
    await pikafishPool.init();
  } catch (err) {
    console.warn('Pikafish init failed (AI unavailable):', err);
  }
});

export { io };
