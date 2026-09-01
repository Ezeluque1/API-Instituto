import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { sedePublicSelect } from '../models/sede.model.js';

/**
 * Crea una sede.
 *
 * No chequea el duplicado a mano: el schema tiene @@unique([nombre, ciudad]),
 * asi que Prisma tira P2002 y el errorHandler lo devuelve como 409. Hacerlo
 * con un findFirst previo ademas seria una condicion de carrera.
 *
 * @param {{ nombre: string, ciudad: string, provincia: string,
 *           direccion?: string, telefono?: string, email?: string }} datos
 */
export async function crear(datos) {
  return prisma.sede.create({
    data: datos,
    select: sedePublicSelect,
  });
}

/**
 * Busca una sede por id.
 *
 * @throws {ApiError} 404 si no existe.
 */
export async function obtenerPorId(id) {
  const sede = await prisma.sede.findUnique({
    where: { id },
    select: sedePublicSelect,
  });

  if (!sede) {
    throw ApiError.notFound('Sede no encontrada');
  }

  return sede;
}
