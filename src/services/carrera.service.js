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

// ============================================================
// ADMIN: crear / editar / dar de baja / eliminar
// ============================================================

/**
 * Convierte un nombre en un slug url-friendly.
 * Minusculas, sin acentos, no alfanumerico -> "-", guiones colapsados y
 * recortados en los extremos.
 */
function slugify(texto) {
  const base = texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return base || 'carrera';
}

/**
 * Genera un slug unico a partir del nombre.
 * Si ya existe, agrega sufijo incremental "-2", "-3", etc.
 */
async function generarSlugUnico(nombre) {
  const base = slugify(nombre);
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.carrera.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existente) return slug;
    slug = `${base}-${contador++}`;
  }
}

/**
 * Verifica que todos los sedeId indicados existan.
 * No exige que esten activas: un admin puede querer vincular una sede
 * que esta dada de baja momentaneamente.
 *
 * @throws {ApiError} 400 si alguna sede no existe.
 */
async function validarSedes(sedeIds) {
  if (!sedeIds || sedeIds.length === 0) return;

  const encontradas = await prisma.sede.findMany({
    where: { id: { in: sedeIds } },
    select: { id: true },
  });

  if (encontradas.length !== sedeIds.length) {
    throw ApiError.badRequest('Una o mas sedes indicadas no existen');
  }
}

/**
 * Crea una carrera. El slug se genera automaticamente a partir del nombre.
 *
 * Si vienen `sedes`, se crean los vinculos en CarreraSede dentro de la misma
 * escritura (nested create), asi la carrera nace ya asociada a sus sedes.
 *
 * @param {{ nombre: string, descripcion?: string, duracionAnios?: number,
 *           tituloOtorgado?: string, modalidad: string, sedes?: string[] }} datos
 * @throws {ApiError} 400 si alguna sede indicada no existe.
 * @throws {ApiError} 409 si no se pudo generar un slug unico (caso extremo).
 */
export async function crear(datos) {
  const { sedes, ...resto } = datos;
  await validarSedes(sedes);

  // Reintento pequeño por si dos requests generan el mismo slug a la vez
  // (condicion de carrera), igual que en publicacion.service.js.
  for (let intento = 0; intento < 3; intento++) {
    const slug = await generarSlugUnico(datos.nombre);
    try {
      return await prisma.carrera.create({
        data: {
          ...resto,
          slug,
          sedes: sedes?.length
            ? { create: sedes.map((sedeId) => ({ sede: { connect: { id: sedeId } } })) }
            : undefined,
        },
        select: carreraPublicSelect,
      });
    } catch (error) {
      if (error?.code === 'P2002' && intento < 2) {
        continue;
      }
      if (error?.code === 'P2002') {
        throw ApiError.conflict('Ya existe una carrera con ese slug');
      }
      throw error;
    }
  }
  throw ApiError.conflict('Ya existe una carrera con ese slug');
}

/**
 * Modifica parcialmente una carrera: solo los campos que vengan en `datos`.
 * No se puede editar una carrera dada de baja: primero hay que reactivarla
 * (mismo criterio que sede.service.js).
 *
 * Si `sedes` viene en el body, REEMPLAZA por completo el conjunto de sedes
 * asignadas (se borran los vinculos actuales y se crean los nuevos), todo
 * dentro de una transaccion junto con el update de la carrera.
 *
 * @throws {ApiError} 404 si no existe o esta dada de baja.
 * @throws {ApiError} 400 si alguna sede indicada no existe.
 */
export async function actualizar(id, datos) {
  const { sedes, ...resto } = datos;
  await validarSedes(sedes);

  return prisma.$transaction(async (tx) => {
    // Cuando el body trae SOLO `sedes`, `resto` queda vacio y un updateMany
    // con `data: {}` devuelve count 0 aunque la fila exista. Tomar ese 0 como
    // "no existe" hacia que cambiarle las sedes a una carrera (sin tocar
    // ningun otro campo) devolviera 404. Por eso la existencia se chequea
    // aparte cuando no hay nada escalar que escribir.
    if (Object.keys(resto).length > 0) {
      const { count } = await tx.carrera.updateMany({
        where: { id, activa: true },
        data: resto,
      });

      if (count === 0) {
        throw ApiError.notFound('Carrera no encontrada');
      }
    } else {
      const existe = await tx.carrera.findFirst({
        where: { id, activa: true },
        select: { id: true },
      });

      if (!existe) {
        throw ApiError.notFound('Carrera no encontrada');
      }
    }

    if (sedes !== undefined) {
      await tx.carreraSede.deleteMany({ where: { carreraId: id } });
      if (sedes.length > 0) {
        await tx.carreraSede.createMany({
          data: sedes.map((sedeId) => ({ carreraId: id, sedeId })),
        });
      }
    }

    return tx.carrera.findUnique({ where: { id }, select: carreraPublicSelect });
  });
}

/**
 * Da de baja una carrera. Baja logica: la fila y sus vinculos con sedes
 * quedan en la base (activa: false), asi deja de aparecer en los endpoints
 * publicos sin perder el historial.
 *
 * @throws {ApiError} 404 si no existe o ya estaba dada de baja.
 */
export async function darDeBaja(id) {
  const { count } = await prisma.carrera.updateMany({
    where: { id, activa: true },
    data: { activa: false },
  });

  if (count === 0) {
    throw ApiError.notFound('Carrera no encontrada');
  }
}

/**
 * Elimina fisicamente una carrera (hard delete). A diferencia de darDeBaja,
 * esto NO se puede deshacer.
 *
 * Los vinculos en CarreraSede se borran solos: el schema tiene
 * `onDelete: Cascade` en la relacion CarreraSede -> Carrera.
 *
 * Las preinscripciones NO: esa FK es `onDelete: Restrict`, asi que si hay
 * gente anotada la base rechaza el borrado y la carrera queda intacta. Es a
 * proposito: borrarla en cascada haria desaparecer en silencio los datos de
 * aspirantes reales.
 *
 * @throws {ApiError} 404 si no existe.
 * @throws {ApiError} 409 si tiene preinscripciones.
 */
export async function eliminarDefinitivo(id) {
  try {
    await prisma.carrera.delete({ where: { id } });
  } catch (error) {
    if (error?.code === 'P2025') {
      throw ApiError.notFound('Carrera no encontrada');
    }

    // P2003 = la base freno el borrado por una FK. Sin este bloque, el
    // errorHandler devuelve el mensaje generico "La operacion viola una
    // relacion con otro registro", que no le dice al ADMIN ni cual es el
    // problema ni que hacer. Se cuenta para poder nombrarlo.
    if (error?.code === 'P2003') {
      const preinscripciones = await prisma.preinscripcion.count({
        where: { carreraId: id },
      });

      if (preinscripciones > 0) {
        throw ApiError.conflict(
          `No se puede eliminar la carrera: tiene ${preinscripciones} ` +
            `${preinscripciones === 1 ? 'preinscripcion' : 'preinscripciones'} asociada` +
            `${preinscripciones === 1 ? '' : 's'}. Usa la baja logica (DELETE /carreras/:id) ` +
            'para ocultarla sin perder los datos de los aspirantes.',
          { preinscripciones },
        );
      }
    }

    throw error;
  }
}