import multer from 'multer';

import { ApiError } from '../utils/ApiError.js';

/**
 * Recepcion de archivos subidos por el cliente (multipart/form-data).
 *
 * Guarda en memoria, nunca en disco: en Render el disco es efimero y se pierde
 * en cada deploy, asi que un archivo escrito ahi no sirve para nada. El buffer
 * se pasa directo a storage.service.js y muere ahi.
 */

/** 5 MB por archivo. */
export const MAX_BYTES_POR_IMAGEN = 5 * 1024 * 1024;

/** 5 archivos por request. */
export const MAX_IMAGENES_POR_REQUEST = 5;

/** Nombre del campo del formulario donde vienen los archivos. */
export const CAMPO_IMAGENES = 'imagenes';

/**
 * Formatos aceptados. El mimetype lo declara el cliente y se puede falsificar,
 * asi que esto es solo la primera barrera: la que vale es `resource_type:
 * 'image'` en la subida a Cloudinary, que decodifica el archivo de verdad.
 */
export const MIMETYPES_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

/**
 * 5 MB x 5 archivos = 25 MB de pico por request. `memoryStorage` retiene los
 * archivos enteros en RAM antes de que corra el handler, y la instancia free de
 * Render tiene 512 MB: con limites mas generosos, dos subidas simultaneas
 * tumban el proceso.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES_POR_IMAGEN,
    files: MAX_IMAGENES_POR_REQUEST,
  },
  fileFilter(_req, file, cb) {
    if (!MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
      // multer propaga a next() cualquier error que se le pase aca, asi que
      // mandando un ApiError el errorHandler lo devuelve como 400 con un
      // mensaje entendible en vez de un 500 generico.
      return cb(
        ApiError.badRequest(
          `Formato de imagen no permitido: ${file.mimetype}`,
          { permitidos: MIMETYPES_PERMITIDOS, archivo: file.originalname },
        ),
      );
    }
    cb(null, true);
  },
});

/**
 * Middleware para POST /albums/:id/imagenes. Deja los archivos en `req.files`.
 */
export const recibirImagenes = upload.array(
  CAMPO_IMAGENES,
  MAX_IMAGENES_POR_REQUEST,
);

export default recibirImagenes;
