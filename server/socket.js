import { prisma } from './index.js';

export function setupSocket(io) {
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', async (data) => {
      const { roomCode, playerName } = data;
      
      try {
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() }
        });

        if (!room) {
          socket.emit('error', { message: 'Комната не найдена' });
          return;
        }

        socket.join(roomCode.toUpperCase());
        
        if (!rooms.has(roomCode.toUpperCase())) {
          rooms.set(roomCode.toUpperCase(), new Set());
        }
        rooms.get(roomCode.toUpperCase()).add(socket.id);

        socket.data.roomCode = roomCode.toUpperCase();
        socket.data.playerName = playerName;

        const players = await prisma.player.findMany({
          where: { roomId: room.id },
          orderBy: { score: 'desc' }
        });

        socket.emit('room-state', {
          players,
          room: { id: room.id, name: room.name, status: room.status }
        });

        io.to(roomCode.toUpperCase()).emit('player-joined', { playerName });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Ошибка при входе в комнату' });
      }
    });

    socket.on('host-join', async (data) => {
      const { roomCode, hostId } = data;
      
      try {
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() }
        });

        if (!room || room.hostId !== hostId) {
          socket.emit('error', { message: 'Нет доступа' });
          return;
        }

        socket.join(roomCode.toUpperCase());
        socket.data.roomCode = roomCode.toUpperCase();
        socket.data.isHost = true;

        const players = await prisma.player.findMany({
          where: { roomId: room.id },
          orderBy: { score: 'desc' }
        });

        socket.emit('room-state', {
          players,
          room: { id: room.id, name: room.name, status: room.status }
        });
      } catch (error) {
        console.error('Host join error:', error);
        socket.emit('error', { message: 'Ошибка при входе' });
      }
    });

    socket.on('update-scores', async (data) => {
      const { roomCode, scores, round } = data;
      
      try {
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() }
        });

        if (!room) return;

        if (room.hostId !== socket.data.hostId && !socket.data.isHost) {
          socket.emit('error', { message: 'Нет доступа' });
          return;
        }

        const players = await prisma.player.findMany({
          where: { roomId: room.id }
        });

        for (const [playerId, score] of Object.entries(scores)) {
          const player = players.find(p => p.id === playerId);
          if (player) {
            const newScore = player.score + score;

            await prisma.player.update({
              where: { id: playerId },
              data: { score: newScore }
            });

            await prisma.gameHistory.create({
              data: {
                roomId: room.id,
                playerId,
                score,
                round: round || 1
              }
            });
          }
        }

        const updatedPlayers = await prisma.player.findMany({
          where: { roomId: room.id },
          orderBy: { score: 'desc' }
        });

        io.to(roomCode.toUpperCase()).emit('scores-updated', { players: updatedPlayers });
      } catch (error) {
        console.error('Update scores socket error:', error);
        socket.emit('error', { message: 'Ошибка при обновлении баллов' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      if (socket.data.roomCode) {
        const roomSet = rooms.get(socket.data.roomCode);
        if (roomSet) {
          roomSet.delete(socket.id);
          if (roomSet.size === 0) {
            rooms.delete(socket.data.roomCode);
          }
        }
      }
    });
  });
}