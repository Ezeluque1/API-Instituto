import { z } from 'zod';

/**
 * Campos que la API expone de una Sede. Se deja afuera la relacion `carreras`:
 * si algun endpoint necesita traerlas, arma su propio select.
 */
export const sedePublicSelect = {
  id: true,
  nombre: true,
  ciudad: true,
  provincia: true,
  direccion: true,
  telefono: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Texto obligatorio. El `.trim()` va antes del `.min(1)` a proposito: asi un
 * valor de solo espacios se rechaza en vez de guardarse como string vacio.
 *
 * Ademas normaliza lo que entra a la base, que importa por el unique de
 * (nombre, ciudad): sin esto, `"Sede Centro "` convivira con `"Sede Centro"`
 * esquivando el constraint.
 */
const textoRequerido = (max) => z.string().trim().min(1).max(max);

/** Body del POST /sedes. */
export const crearSedeSchema = z.strictObject({
  nombre: textoRequerido(120),
  ciudad: textoRequerido(80),
  provincia: textoRequerido(80),
  direccion: textoRequerido(200).optional(),
  telefono: textoRequerido(30).optional(),
  email: z.email().max(120).optional(),
});

/**
 * Valida el :id de la URL. Los ids del schema son cuid, asi que un id mal
 * formado se corta con un 400 y nunca llega a consultar la base.
 */
export const sedeIdParamSchema = z.object({
  id: z.cuid(),
});
