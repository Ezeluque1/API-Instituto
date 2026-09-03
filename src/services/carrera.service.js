import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { carreraPublicSelect } from '../models/carrera.model.js';

/**
 * Lista las carreras activas.
 *
 * Permite filtrar por:
 * - nombre, mediante `buscar`
 * - modalidad
 * - sede
 *
 * Si no hay ninguna carrera que coincida, devuelve [].
 *
 * @param {{
 *   buscar?: string,
 *   modalidad?: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA',
 *   sede?: string
 * }} [opciones]
 */
export async function listar({ buscar, modalidad, sede } = {}) {
  const where = {
    activa: true,
  };

  if (buscar) {
    where.nombre = {
      contains: buscar,
      mode: 'insensitive',
    };
  }

  if (modalidad) {
    where.modalidad = modalidad;
  }

  if (sede) {
    where.sedes = {
      some: {
        sedeId: sede,
      },
    };
  }

  return prisma.carrera.findMany({
    where,
    select: carreraPublicSelect,
    orderBy: { nombre: 'asc' },
  });
}

/**
 * Busca una carrera por ID.
 *
 * Las carreras dadas de baja no son visibles para el público,
 * por lo que se comportan como si no existieran.
 *
 * @throws {ApiError} 404 si no existe o está dada de baja.
 */
export async function obtenerPorId(id) {
  const carrera = await prisma.carrera.findUnique({
    where: { id },
    select: carreraPublicSelect,
  });

  if (!carrera || !carrera.activa) {
    throw ApiError.notFound('Carrera no encontrada');
  }

  return carrera;
}