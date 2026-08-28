import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Se monta despues de todas las rutas: cualquier URL que no matcheo cae aca. */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Manejador de errores centralizado. Express 5 propaga solo los rejects de los
 * handlers `async`, asi que no hace falta envolverlos en un `asyncHandler`.
 */
// eslint-disable-next-line no-unused-vars -- Express identifica el handler por sus 4 params
export function errorHandler(error, _req, res, _next) {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details = null;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Datos de entrada invalidos';
    details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    ({ statusCode, message, details } = mapPrismaError(error));
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Consulta invalida a la base de datos';
  } else if (error.type === 'entity.parse.failed') {
    // Body con JSON mal formado (lo lanza express.json()).
    statusCode = 400;
    message = 'El body no es un JSON valido';
  }

  // Los 5xx son bugs nuestros: se loguean completos aunque no se muestren.
  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(env.isDev && { stack: error.stack }),
  });
}

/** Traduce los codigos de error de Prisma a respuestas HTTP con sentido. */
function mapPrismaError(error) {
  const target = error.meta?.target;
  const campos = Array.isArray(target) ? target.join(', ') : target;

  switch (error.code) {
    case 'P2002':
      return {
        statusCode: 409,
        message: `Ya existe un registro con ese valor${campos ? ` en: ${campos}` : ''}`,
        details: null,
      };
    case 'P2003':
      return {
        statusCode: 409,
        message: 'La operacion viola una relacion con otro registro',
        details: null,
      };
    case 'P2025':
      return {
        statusCode: 404,
        message: 'El registro solicitado no existe',
        details: null,
      };
    default:
      return {
        statusCode: 500,
        message: 'Error de base de datos',
        details: env.isDev ? { code: error.code } : null,
      };
  }
}
