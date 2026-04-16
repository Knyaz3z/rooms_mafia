import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, gameDate } = req.body;

    if (!name || !gameDate) {
      return res.status(400).json({ error: 'Укажите название и дату игры' });
    }

    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      const existing = await prisma.room.findUnique({ where: { code } });
      exists = !!existing;
    }

    const room = await prisma.room.create({
      data: {
        hostId: req.user.id,
        name,
        gameDate: new Date(gameDate),
        code
      },
      include: {
        host: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const qrCode = await QRCode.toDataURL(`${process.env.CLIENT_URL || 'http://localhost:5173'}/room/${code}`);

    res.json({ ...room, qrCode });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Ошибка при создании комнаты' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { hostId: req.user.id },
      include: {
        players: true,
        host: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Ошибка при получении комнат' });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        host: {
          select: { id: true, name: true }
        },
        players: {
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    const qrCode = await QRCode.toDataURL(`${process.env.CLIENT_URL || 'http://localhost:5173'}/room/${code}`);

    res.json({ ...room, qrCode });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Ошибка при получении комнаты' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gameDate, status } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(gameDate && { gameDate: new Date(gameDate) }),
        ...(status && { status })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении комнаты' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({ where: { id } });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await prisma.room.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Ошибка при удалении комнаты' });
  }
});

export default router;