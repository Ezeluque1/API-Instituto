import * as carreraService from '../services/carrera.service.js';

// Sin try/catch: Express 5 propaga los rejects de los handlers async
// al errorHandler centralizado.

/**
 * GET /api/carreras
 *
 * Lista las carreras activas y permite aplicar búsqueda y filtros.
 */
export async function listar(req, res) {
  res.ok(await carreraService.listar(req.validated.query));
}

/**
 * GET /api/carreras/:id
 *
 * Obtiene el detalle de una carrera activa.
 */
export async function obtenerPorId(req, res) {
  res.ok(await carreraService.obtenerPorId(req.params.id));
}