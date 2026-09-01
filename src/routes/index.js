import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import usuarioRoutes from './usuario.routes.js';

const router = Router();

// Health check: no alcanza con responder "ok", tambien verifica que la
// conexion a PostgreSQL este viva.
router.get('/health', async (_req, res) => {
  let database = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'disconnected';
  }

  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Rutas de usuarios
router.use('/usuarios', usuarioRoutes);

export default router;