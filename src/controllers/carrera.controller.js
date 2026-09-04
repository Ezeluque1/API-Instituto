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

// ============================================================
// ADMIN: crear / editar / dar de baja / eliminar
// ============================================================

/** POST /api/carreras */
export async function crear(req, res) {
  const carrera = await carreraService.crear(req.body);
  res.created(carrera, `/api/carreras/${carrera.id}`);
}

/** PATCH /api/carreras/:id */
export async function actualizar(req, res) {
  res.ok(await carreraService.actualizar(req.params.id, req.body));
}

/** DELETE /api/carreras/:id - baja logica */
export async function eliminar(req, res) {
  await carreraService.darDeBaja(req.params.id);
  res.noContent();
}

/** DELETE /api/carreras/:id/definitivo - hard delete */
export async function eliminarDefinitivo(req, res) {
  await carreraService.eliminarDefinitivo(req.params.id);
  res.noContent();
}