import { Router } from 'express';
import * as controller from '../controllers/usuario.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

import {
  crearUsuarioSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  actualizarPerfilSchema,
  cambiarPasswordSchema,
  buscarUsuariosSchema,
  idParamSchema,
  cambiarRolSchema,
  recuperarPasswordSchema,
  resetPasswordSchema,
} from '../models/usuario.model.js';

const router = Router();

// ============================================================
// AUTENTICACIÓN
// ============================================================

// Registrar usuario
router.post(
  '/registro',
  validate({ body: crearUsuarioSchema }),
  controller.registrar,
);

// Iniciar sesión
router.post(
  '/login',
  validate({ body: loginSchema }),
  controller.login,
);

// Renovar token de acceso
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  controller.renovarToken,
);

// Cerrar sesión
router.post(
  '/logout',
  authenticate,
  validate({ body: logoutSchema }),
  controller.logout,
);

// Cerrar todas las sesiones
router.post(
  '/logout-all',
  authenticate,
  controller.logoutAll,
);

// Recuperar contraseña
router.post(
  '/recuperar-password',
  validate({ body: recuperarPasswordSchema }),
  controller.recuperarPassword,
);

// Restablecer contraseña
router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  controller.resetPassword,
);

// ============================================================
// PERFIL PROPIO
// ============================================================

// Ver perfil
router.get(
  '/perfil',
  authenticate,
  controller.obtenerPerfil,
);

// Editar perfil
router.patch(
  '/perfil',
  authenticate,
  validate({ body: actualizarPerfilSchema }),
  controller.actualizarPerfil,
);

// Cambiar contraseña
router.patch(
  '/perfil/password',
  authenticate,
  validate({ body: cambiarPasswordSchema }),
  controller.cambiarPassword,
);

// ============================================================
// ADMINISTRACIÓN DE USUARIOS
// ============================================================

// Listar usuarios
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  controller.listarUsuarios,
);

// Buscar usuarios
router.get(
  '/buscar',
  authenticate,
  authorize('ADMIN'),
  validate({ query: buscarUsuariosSchema }),
  controller.buscarUsuarios,
);

// Cambiar rol
router.patch(
  '/:id/rol',
  authenticate,
  authorize('ADMIN'),
  validate({
    params: idParamSchema,
    body: cambiarRolSchema,
  }),
  controller.cambiarRol,
);

// Desactivar usuario
router.patch(
  '/:id/desactivar',
  authenticate,
  authorize('ADMIN'),
  validate({
    params: idParamSchema,
  }),
  controller.desactivarUsuario,
);

export default router;