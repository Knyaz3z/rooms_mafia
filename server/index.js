import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import corsOptions from './corsOptions.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import playerRoutes from './routes/players.js';
import { setupSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions
});

export const prisma = new PrismaClient();

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/players', playerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

setupSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };