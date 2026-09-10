import * as usuarioService from '../services/usuario.service.js';

export async function registrar(req, res) {
  const usuario = await usuarioService.registrar(req.body);

  res.status(201).json({
    success: true,
    data: usuario,
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const resultado = await usuarioService.login(email, password);

  res.json({
    success: true,
    data: resultado,
  });
}

export async function renovarToken(req, res) {
  const { refreshToken } = req.body;

  const resultado = await usuarioService.renovarToken(refreshToken);

  res.json({
    success: true,
    data: resultado,
  });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;

  await usuarioService.logout(refreshToken);

  res.json({
    success: true,
    message: 'Sesión cerrada correctamente',
  });
}

export async function logoutAll(req, res) {
  await usuarioService.logoutAll(req.user.id);

  res.json({
    success: true,
    message: 'Todas las sesiones fueron cerradas correctamente',
  });
}

export async function obtenerPerfil(req, res) {
  const usuario = await usuarioService.obtenerPerfil(req.user.id);

  res.json({
    success: true,
    data: usuario,
  });
}

export async function actualizarPerfil(req, res) {
  const usuario = await usuarioService.actualizarPerfil(
    req.user.id,
    req.body,
  );

  res.json({
    success: true,
    data: usuario,
  });
}

export async function cambiarPassword(req, res) {
  const { passwordActual, nuevaPassword } = req.body;

  const resultado = await usuarioService.cambiarPassword(
    req.user.id,
    passwordActual,
    nuevaPassword,
  );

  res.json({
    success: true,
    message: resultado.message,
  });
}

export async function recuperarPassword(req, res) {
  const resultado = await usuarioService.recuperarPassword(req.body.email);

  res.json({
    success: true,
    data: resultado,
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;

  const resultado = await usuarioService.resetPassword(token, password);

  res.json({
    success: true,
    message: resultado.message,
  });
}

export async function obtenerPorId(req, res) {
  const usuario = await usuarioService.obtenerPorId(req.validated.params.id);

  res.json({
    success: true,
    data: usuario,
  });
}

export async function listarUsuarios(req, res) {
  const resultado = await usuarioService.listarUsuarios(
    req.validated?.query || {},
  );

  res.json({
    success: true,
    ...resultado,
  });
}

export async function buscarUsuarios(req, res) {
  const { buscar, ...opciones } = req.validated.query;

  const resultado = await usuarioService.buscarUsuarios(buscar, opciones);

  res.json({
    success: true,
    ...resultado,
  });
}

export async function cambiarRol(req, res) {
  const usuario = await usuarioService.cambiarRol(
    req.validated.params.id,
    req.body.rol,
    req.user.id,
  );

  res.json({
    success: true,
    data: usuario,
  });
}

export async function desactivarUsuario(req, res) {
  const usuario = await usuarioService.desactivarUsuario(
    req.validated.params.id,
    req.user.id,
  );

  res.json({
    success: true,
    data: usuario,
  });
}

export async function reactivarUsuario(req, res) {
  const usuario = await usuarioService.reactivarUsuario(
    req.validated.params.id,
  );

  res.json({
    success: true,
    data: usuario,
  });
}