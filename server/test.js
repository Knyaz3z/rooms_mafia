import 'dotenv/config';
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/test', async () => {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany();
  return users;
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server on ${PORT}`);
});