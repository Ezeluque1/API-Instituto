import { Router } from 'express';

import * as controller from '../controllers/sede.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  crearSedeSchema,
  actualizarSedeSchema,
  sedeIdParamSchema,
  sedesQuerySchema,
} from '../models/sede.model.js';

const router = Router();

router.get('/', validate({ query: sedesQuerySchema }), controller.listar);

// TODO: cuando exista el modulo de auth, sumar `authenticate, authorize('ADMIN')`
// entre la ruta y el validate. Hoy queda publico porque todavia no hay forma
// de emitir un JWT (no existe el endpoint de login).
router.post('/', validate({ body: crearSedeSchema }), controller.crear);

router.get(
  '/:id',
  validate({ params: sedeIdParamSchema, query: sedesQuerySchema }),
  controller.obtenerPorId,
);

// Mismo TODO de auth que el POST.
router.patch(
  '/:id',
  validate({ params: sedeIdParamSchema, body: actualizarSedeSchema }),
  controller.actualizar,
);

// Baja logica: la fila queda en la base con activa=false.
router.delete('/:id', validate({ params: sedeIdParamSchema }), controller.eliminar);

router.post(
  '/:id/reactivar',
  validate({ params: sedeIdParamSchema }),
  controller.reactivar,
);

export default router;
