import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import sedeRoutes from './sede.routes.js';
import usuarioRoutes from './usuario.routes.js';
import publicacionRoutes from './publicacion.routes.js';
import albumRoutes from './album.routes.js';

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

// Un router por recurso. Mirar sede.routes.js como referencia para los que
// falten (carreras, contacto).
router.use('/sedes', sedeRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/publicaciones', publicacionRoutes);
router.use('/albums', albumRoutes);

export default router;
