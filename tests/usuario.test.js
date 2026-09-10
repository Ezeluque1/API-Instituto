import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/password.js';

describe('Suite de Pruebas: Modulo de Usuarios y Autenticacion', () => {
  let server;
  let baseUrl;

  // Tokens y datos de usuarios para pruebas
  let adminToken;
  let adminId;
  let standardUserToken;
  let standardUserId;
  let standardUserRefreshToken;
  let userForDeactivationId;

  // Helper para realizar solicitudes HTTP
  async function api(path, options = {}) {
    const { method = 'GET', body, token, headers = {} } = options;
    const reqHeaders = { ...headers };

    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    }

    return {
      status: response.status,
      ok: response.ok,
      body: data,
    };
  }

  before(async () => {
    // Iniciar servidor HTTP efímero
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api`;

    // Limpiar usuarios de prueba anteriores
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.usuario.deleteMany({
      where: { email: { contains: 'test.suite.' } },
    });

    // Crear un Administrador y un Usuario estándar iniciales
    const passwordHash = await hashPassword('Password123!');

    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Prueba',
        email: 'test.suite.admin@instituto.edu.ar',
        dni: '88000001',
        passwordHash,
        rol: 'ADMIN',
        activo: true,
      },
    });
    adminId = admin.id;

    const user = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Prueba',
        email: 'test.suite.user@instituto.edu.ar',
        dni: '88000002',
        passwordHash,
        rol: 'USUARIO',
        activo: true,
      },
    });
    standardUserId = user.id;

    // Obtener tokens mediante login
    const adminLoginRes = await api('/usuarios/login', {
      method: 'POST',
      body: {
        email: 'test.suite.admin@instituto.edu.ar',
        password: 'Password123!',
      },
    });
    adminToken = adminLoginRes.body.data.accessToken;

    const userLoginRes = await api('/usuarios/login', {
      method: 'POST',
      body: {
        email: 'test.suite.user@instituto.edu.ar',
        password: 'Password123!',
      },
    });
    standardUserToken = userLoginRes.body.data.accessToken;
    standardUserRefreshToken = userLoginRes.body.data.refreshToken;
  });

  after(async () => {
    // Limpieza final de la base de datos y cierre de servidor
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.usuario.deleteMany({
      where: { email: { contains: 'test.suite.' } },
    });

    await prisma.$disconnect();
    server.close();
  });

  // ============================================================
  // 1. AUTENTICACIÓN Y REGISTRO
  // ============================================================
  describe('1. Registro y Autenticacion', () => {
    it('debe registrar un nuevo usuario exitosamente (201)', async () => {
      const res = await api('/usuarios/registro', {
        method: 'POST',
        body: {
          nombre: 'Nuevo',
          apellido: 'Alumno',
          email: 'test.suite.nuevo@instituto.edu.ar',
          dni: '88000003',
          password: 'PasswordSegura123!',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, 'test.suite.nuevo@instituto.edu.ar');
      assert.equal(res.body.data.rol, 'USUARIO');
      assert.equal(res.body.data.passwordHash, undefined);
    });

    it('debe rechazar registro con email duplicado (409)', async () => {
      const res = await api('/usuarios/registro', {
        method: 'POST',
        body: {
          nombre: 'Otro',
          apellido: 'Nombre',
          email: 'test.suite.nuevo@instituto.edu.ar',
          dni: '88000099',
          password: 'PasswordSegura123!',
        },
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Ya existe un usuario/i);
    });

    it('debe rechazar registro con DNI duplicado (409)', async () => {
      const res = await api('/usuarios/registro', {
        method: 'POST',
        body: {
          nombre: 'Otro',
          apellido: 'Nombre',
          email: 'test.suite.diferente@instituto.edu.ar',
          dni: '88000003',
          password: 'PasswordSegura123!',
        },
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Ya existe un usuario/i);
    });

    it('debe rechazar registro con datos invalidos (400)', async () => {
      const res = await api('/usuarios/registro', {
        method: 'POST',
        body: {
          nombre: '',
          email: 'email-invalido',
          password: '123',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('debe iniciar sesion con credenciales correctas (200)', async () => {
      const res = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.nuevo@instituto.edu.ar',
          password: 'PasswordSegura123!',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.equal(res.body.data.usuario.email, 'test.suite.nuevo@instituto.edu.ar');
    });

    it('debe rechazar inicio de sesion con contraseña incorrecta (401)', async () => {
      const res = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.nuevo@instituto.edu.ar',
          password: 'ClaveEquivocada!',
        },
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('debe renovar el accessToken y rotar el refreshToken (200)', async () => {
      const res = await api('/usuarios/refresh', {
        method: 'POST',
        body: {
          refreshToken: standardUserRefreshToken,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.notEqual(res.body.data.refreshToken, standardUserRefreshToken);

      // Actualizamos el token para siguientes pruebas
      standardUserRefreshToken = res.body.data.refreshToken;
      standardUserToken = res.body.data.accessToken;
    });

    it('debe rechazar la renovacion con refresh token revocado (401)', async () => {
      // Intentar usar el token que ya fue rotado
      const res = await api('/usuarios/refresh', {
        method: 'POST',
        body: {
          refreshToken: 'token_ficticio_o_invalido_12345',
        },
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('debe cerrar sesion invalidando el refresh token (200)', async () => {
      const res = await api('/usuarios/logout', {
        method: 'POST',
        token: standardUserToken,
        body: {
          refreshToken: standardUserRefreshToken,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verificar que el refresh token ya no funciona
      const refreshRes = await api('/usuarios/refresh', {
        method: 'POST',
        body: {
          refreshToken: standardUserRefreshToken,
        },
      });
      assert.equal(refreshRes.status, 401);
    });

    it('debe cerrar todas las sesiones del usuario con logout-all (200)', async () => {
      // Crear nueva sesion
      const loginRes = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.nuevo@instituto.edu.ar',
          password: 'PasswordSegura123!',
        },
      });
      const token = loginRes.body.data.accessToken;
      const refToken = loginRes.body.data.refreshToken;

      const logoutAllRes = await api('/usuarios/logout-all', {
        method: 'POST',
        token,
      });

      assert.equal(logoutAllRes.status, 200);
      assert.equal(logoutAllRes.body.success, true);

      // Verificar que el refresh token fue revocado
      const checkRes = await api('/usuarios/refresh', {
        method: 'POST',
        body: { refreshToken: refToken },
      });
      assert.equal(checkRes.status, 401);
    });

    it('debe permitir recuperar y restablecer contraseña invalidando sesiones previas (200)', async () => {
      // 1. Iniciar sesion y obtener refresh token
      const loginRes = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.nuevo@instituto.edu.ar',
          password: 'PasswordSegura123!',
        },
      });
      const activeRefreshToken = loginRes.body.data.refreshToken;

      // 2. Solicitar recuperacion
      const recupRes = await api('/usuarios/recuperar-password', {
        method: 'POST',
        body: {
          email: 'test.suite.nuevo@instituto.edu.ar',
        },
      });
      assert.equal(recupRes.status, 200);
      const resetToken = recupRes.body.data.token;
      assert.ok(resetToken);

      // 3. Restablecer contraseña
      const resetRes = await api('/usuarios/reset-password', {
        method: 'POST',
        body: {
          token: resetToken,
          password: 'NuevaPasswordDefinitiva123!',
        },
      });
      assert.equal(resetRes.status, 200);

      // 4. Verificar que el refresh token previo quedó invalidado
      const testOldSession = await api('/usuarios/refresh', {
        method: 'POST',
        body: { refreshToken: activeRefreshToken },
      });
      assert.equal(testOldSession.status, 401);

      // 5. Iniciar sesion con la nueva clave
      const newLoginRes = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.nuevo@instituto.edu.ar',
          password: 'NuevaPasswordDefinitiva123!',
        },
      });
      assert.equal(newLoginRes.status, 200);
    });
  });

  // ============================================================
  // 2. PERFIL PROPIO
  // ============================================================
  describe('2. Gestion de Perfil', () => {
    let userToken;

    before(async () => {
      const loginRes = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.user@instituto.edu.ar',
          password: 'Password123!',
        },
      });
      userToken = loginRes.body.data.accessToken;
    });

    it('debe obtener el perfil del usuario autenticado (200)', async () => {
      const res = await api('/usuarios/perfil', {
        token: userToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, 'test.suite.user@instituto.edu.ar');
      assert.equal(res.body.data.passwordHash, undefined);
    });

    it('debe actualizar los datos del perfil propio (200)', async () => {
      const res = await api('/usuarios/perfil', {
        method: 'PATCH',
        token: userToken,
        body: {
          nombre: 'NombreActualizado',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.nombre, 'NombreActualizado');
    });

    it('debe rechazar actualizacion con email que pertenece a otro usuario (409)', async () => {
      const res = await api('/usuarios/perfil', {
        method: 'PATCH',
        token: userToken,
        body: {
          email: 'test.suite.admin@instituto.edu.ar',
        },
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Ya existe otro usuario/i);
    });

    it('debe cambiar la contraseña verificando la clave anterior (200)', async () => {
      const res = await api('/usuarios/perfil/password', {
        method: 'PATCH',
        token: userToken,
        body: {
          passwordActual: 'Password123!',
          nuevaPassword: 'PasswordRenovada123!',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Comprobar login con nueva clave
      const loginRes = await api('/usuarios/login', {
        method: 'POST',
        body: {
          email: 'test.suite.user@instituto.edu.ar',
          password: 'PasswordRenovada123!',
        },
      });
      assert.equal(loginRes.status, 200);
      userToken = loginRes.body.data.accessToken;
    });

    it('debe rechazar cambio de contraseña con clave actual incorrecta (400)', async () => {
      const res = await api('/usuarios/perfil/password', {
        method: 'PATCH',
        token: userToken,
        body: {
          passwordActual: 'ClaveIncorrecta!',
          nuevaPassword: 'OtraPassword123!',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /incorrecta/i);
    });
  });

  // ============================================================
  // 3. ADMINISTRACIÓN DE USUARIOS
  // ============================================================
  describe('3. Administracion de Usuarios (Solo ADMIN)', () => {
    before(async () => {
      // Crear un usuario auxiliar para pruebas de desactivacion/reactivacion
      const passwordHash = await hashPassword('Password123!');
      const auxUser = await prisma.usuario.create({
        data: {
          nombre: 'Para',
          apellido: 'Desactivar',
          email: 'test.suite.desactivar@instituto.edu.ar',
          dni: '88000099',
          passwordHash,
          rol: 'USUARIO',
          activo: true,
        },
      });
      userForDeactivationId = auxUser.id;
    });

    it('debe rechazar acceso a endpoints de administracion para usuarios sin rol ADMIN (403)', async () => {
      const res = await api('/usuarios', {
        token: standardUserToken,
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it('debe listar usuarios con paginacion y metadatos como ADMIN (200)', async () => {
      const res = await api('/usuarios?page=1&limit=2', {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body.total, 'number');
      assert.equal(res.body.page, 1);
      assert.equal(res.body.limit, 2);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);
    });

    it('debe filtrar usuarios por rol y estado activo (200)', async () => {
      const resRol = await api('/usuarios?rol=ADMIN', {
        token: adminToken,
      });

      assert.equal(resRol.status, 200);
      assert.ok(resRol.body.data.every((u) => u.rol === 'ADMIN'));

      const resActivo = await api('/usuarios?activo=true', {
        token: adminToken,
      });

      assert.equal(resActivo.status, 200);
      assert.ok(resActivo.body.data.every((u) => u.activo === true));
    });

    it('debe buscar usuarios por nombre, apellido, email o DNI (200)', async () => {
      const res = await api('/usuarios/buscar?buscar=Desactivar', {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].apellido, 'Desactivar');
    });

    it('debe obtener un usuario por su ID CUID (200)', async () => {
      const res = await api(`/usuarios/${standardUserId}`, {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, standardUserId);
    });

    it('debe retornar 404 al buscar un usuario por ID inexistente', async () => {
      const res = await api('/usuarios/cmtj7zzzz0000fo1v99999999', {
        token: adminToken,
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    it('debe cambiar el rol de un usuario (200)', async () => {
      const res = await api(`/usuarios/${standardUserId}/rol`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          rol: 'ADMIN',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.rol, 'ADMIN');

      // Revertir rol a USUARIO
      await api(`/usuarios/${standardUserId}/rol`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          rol: 'USUARIO',
        },
      });
    });

    it('debe impedir que un administrador se quite su propio rol (400)', async () => {
      const res = await api(`/usuarios/${adminId}/rol`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          rol: 'USUARIO',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /propio rol/i);
    });

    it('debe desactivar un usuario con soft-delete (200)', async () => {
      const res = await api(`/usuarios/${userForDeactivationId}/desactivar`, {
        method: 'PATCH',
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.activo, false);
    });

    it('debe impedir que un administrador se desactive a si mismo (400)', async () => {
      const res = await api(`/usuarios/${adminId}/desactivar`, {
        method: 'PATCH',
        token: adminToken,
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /propia cuenta/i);
    });

    it('debe reactivar un usuario desactivado (200)', async () => {
      const res = await api(`/usuarios/${userForDeactivationId}/reactivar`, {
        method: 'PATCH',
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.activo, true);
    });

    it('debe rechazar la reactivacion de un usuario que ya esta activo (400)', async () => {
      const res = await api(`/usuarios/${userForDeactivationId}/reactivar`, {
        method: 'PATCH',
        token: adminToken,
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /ya está activo/i);
    });
  });
});
