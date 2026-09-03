import { Router } from 'express';

import * as controller from '../controllers/carrera.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateOptional } from '../middlewares/auth.middleware.js';
import {
  carreraIdParamSchema,
  carrerasListadoQuerySchema,
} from '../models/carrera.model.js';

const router = Router();

/**
 * GET /api/carreras
 *
 * Endpoint publico. Lista las carreras activas y permite
 * buscar por nombre y filtrar por modalidad o sede.
 */
router.get(
  '/',
  authenticateOptional,
  validate({ query: carrerasListadoQuerySchema }),
  controller.listar,
);

/**
 * GET /api/carreras/:id
 *
 * Endpoint publico. Obtiene el detalle de una carrera activa.
 */
router.get(
  '/:id',
  authenticateOptional,
  validate({ params: carreraIdParamSchema }),
  controller.obtenerPorId,
);

export default router;