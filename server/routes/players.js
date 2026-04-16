import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, avatar } = req.body;

    if (!name || !avatar) {
      return res.status(400).json({ error: 'Укажите имя и аватар' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.status === 'FINISHED') {
      return res.status(400).json({ error: 'Игра уже завершена' });
    }

    const existingPlayer = room.players.find(p => p.name === name);
    if (existingPlayer) {
      return res.status(400).json({ error: 'Такое имя уже занято' });
    }

    const player = await prisma.player.create({
      data: {
        roomId,
        name,
        avatar
      }
    });

    res.json(player);
  } catch (error) {
    console.error('Add player error:', error);
    res.status(500).json({ error: 'Ошибка при добавлении игрока' });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const players = await prisma.player.findMany({
      where: { roomId },
      orderBy: { score: 'desc' }
    });

    res.json(players);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Ошибка при получении игроков' });
  }
});

router.put('/:roomId/scores', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { scores, round } = req.body;

    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const players = await prisma.player.findMany({
      where: { roomId }
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
            roomId,
            playerId,
            score,
            round: round || 1
          }
        });
      }
    }

    const updatedPlayers = await prisma.player.findMany({
      where: { roomId },
      orderBy: { score: 'desc' }
    });

    res.json(updatedPlayers);
  } catch (error) {
    console.error('Update scores error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении баллов' });
  }
});

router.put('/:playerId', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { name, avatar, score } = req.body;

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { room: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }

    if (player.room.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(score !== undefined && { score })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении игрока' });
  }
});

router.delete('/:playerId', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { room: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }

    if (player.room.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await prisma.player.delete({ where: { id: playerId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ error: 'Ошибка при удалении игрока' });
  }
});

export default router;