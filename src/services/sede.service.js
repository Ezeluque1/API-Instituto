import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { sedePublicSelect, sedeDetalleSelect } from '../models/sede.model.js';

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
 * Lista todas las sedes, ordenadas por nombre.
 *
 * No trae las carreras: son un dato del detalle, no de la grilla. Si no hay
 * ninguna sede devuelve `[]`, nunca un 404.
 */
export async function listar() {
  return prisma.sede.findMany({
    select: sedePublicSelect,
    orderBy: { nombre: 'asc' },
  });
}

/**
 * Busca una sede por id, con las carreras que se dictan en ella.
 *
 * Ver `sedeDetalleSelect` por la forma anidada de `carreras`.
 *
 * @throws {ApiError} 404 si no existe.
 */
export async function obtenerPorId(id) {
  const sede = await prisma.sede.findUnique({
    where: { id },
    select: sedeDetalleSelect,
  });

  if (!sede) {
    throw ApiError.notFound('Sede no encontrada');
  }

  return sede;
}
