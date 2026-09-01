import { Router } from 'express';

import * as controller from '../controllers/sede.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { crearSedeSchema, sedeIdParamSchema } from '../models/sede.model.js';

const router = Router();

// Sin validate(): no recibe body, params ni query.
router.get('/', controller.listar);

// TODO: cuando exista el modulo de auth, sumar `authenticate, authorize('ADMIN')`
// entre la ruta y el validate. Hoy queda publico porque todavia no hay forma
// de emitir un JWT (no existe el endpoint de login).
router.post('/', validate({ body: crearSedeSchema }), controller.crear);

router.get('/:id', validate({ params: sedeIdParamSchema }), controller.obtenerPorId);

export default router;
