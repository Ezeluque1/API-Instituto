import * as sedeService from '../services/sede.service.js';

// Sin try/catch: Express 5 propaga solo los rejects de los handlers async al
// errorHandler centralizado.

/** POST /api/sedes */
export async function crear(req, res) {
  // req.body ya viene validado y normalizado por validate({ body: ... }).
  const sede = await sedeService.crear(req.body);
  res.created(sede, `/api/sedes/${sede.id}`);
}

/** GET /api/sedes/:id */
export async function obtenerPorId(req, res) {
  res.ok(await sedeService.obtenerPorId(req.params.id));
}
