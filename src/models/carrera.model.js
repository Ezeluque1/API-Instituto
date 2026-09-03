import { z } from 'zod';

export const carreraPublicSelect = {
  id: true,
  nombre: true,
  slug: true,
  descripcion: true,
  duracionAnios: true,
  tituloOtorgado: true,
  modalidad: true,
  activa: true,
  createdAt: true,
  updatedAt: true,
};

export const carreraIdParamSchema = z.object({
  id: z.cuid(),
});

export const carrerasListadoQuerySchema = z.strictObject({
  buscar: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || undefined),

  modalidad: z
    .enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'])
    .optional(),

  sede: z
    .string()
    .cuid()
    .optional(),
});