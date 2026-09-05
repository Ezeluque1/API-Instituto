import { Router } from 'express';

import * as controller from '../controllers/carrera.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateOptional, authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  carreraIdParamSchema,
  carrerasListadoQuerySchema,
  crearCarreraSchema,
  actualizarCarreraSchema,
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

// De aca para abajo, solo ADMIN.

/** POST /api/carreras */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: crearCarreraSchema }),
  controller.crear,
);

/** PATCH /api/carreras/:id */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: carreraIdParamSchema, body: actualizarCarreraSchema }),
  controller.actualizar,
);

/** DELETE /api/carreras/:id - baja logica (activa: false) */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: carreraIdParamSchema }),
  controller.eliminar,
);

/** DELETE /api/carreras/:id/definitivo - hard delete, no se puede deshacer */
router.delete(
  '/:id/definitivo',
  authenticate,
  authorize('ADMIN'),
  validate({ params: carreraIdParamSchema }),
  controller.eliminarDefinitivo,
);
export default router;