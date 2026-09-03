import { z } from 'zod';

// Campos que pueden salir hacia el cliente.
// Nunca incluimos passwordHash, resetTokens ni refreshTokens.
export const usuarioPublicSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  dni: true,
  rol: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
};

// Validación para registrar un usuario.
export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  email: z.email('El email no es valido'),
  dni: z.string().min(1, 'El DNI es obligatorio'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// Validación para iniciar sesión.
export const loginSchema = z.object({
  email: z.email('El email no es valido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

// Validación para cerrar sesión o renovar token.
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es obligatorio'),
});

// Validación para renovar el token de acceso.
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es obligatorio'),
});

// Validación para editar el perfil propio.
export const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').optional(),
  apellido: z.string().min(1, 'El apellido es obligatorio').optional(),
  email: z.email('El email no es valido').optional(),
  dni: z.string().min(1, 'El DNI es obligatorio').optional(),
});

// Validación para cambiar la contraseña estando autenticado.
export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es obligatoria'),
  nuevaPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

// Validación para listar usuarios con paginación y filtros.
export const listarUsuariosQuerySchema = z.object({
  page: z.coerce.number().int().positive('La página debe ser mayor a 0').default(1),
  limit: z.coerce.number().int().positive('El límite debe ser mayor a 0').max(100, 'El límite máximo es 100').default(10),
  rol: z.enum(['ADMIN', 'USUARIO']).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

// Validación para buscar usuarios como administrador.
export const buscarUsuariosSchema = z.object({
  buscar: z.string().min(1).optional(),
  page: z.coerce.number().int().positive('La página debe ser mayor a 0').default(1),
  limit: z.coerce.number().int().positive('El límite debe ser mayor a 0').max(100, 'El límite máximo es 100').default(10),
  rol: z.enum(['ADMIN', 'USUARIO']).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

// Validación del ID recibido por URL.
export const idParamSchema = z.object({
  id: z.string().cuid('El ID de usuario no es valido'),
});

// Validación para cambiar el rol.
export const cambiarRolSchema = z.object({
  rol: z.enum(['ADMIN', 'USUARIO']),
});

// Validación para solicitar recuperación de contraseña.
export const recuperarPasswordSchema = z.object({
  email: z.email('El email no es valido'),
});

// Validación para restablecer la contraseña.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});