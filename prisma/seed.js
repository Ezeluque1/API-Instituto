import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('Iniciando la carga de datos iniciales (seeding)...');

  const adminPasswordHash = await bcrypt.hash('Admin1234!', SALT_ROUNDS);
  const userPasswordHash = await bcrypt.hash('User1234!', SALT_ROUNDS);

  // 1. Usuario Administrador Inicial
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@instituto.edu.ar' },
    update: {
      rol: 'ADMIN',
      activo: true,
    },
    create: {
      nombre: 'Administrador',
      apellido: 'Principal',
      email: 'admin@instituto.edu.ar',
      dni: '00000001',
      passwordHash: adminPasswordHash,
      rol: 'ADMIN',
      activo: true,
    },
  });
  console.log(`Administrador asegurado: ${admin.email} (Rol: ${admin.rol})`);

  // 2. Usuario Docente / Estándar
  const docente = await prisma.usuario.upsert({
    where: { email: 'docente@instituto.edu.ar' },
    update: {
      rol: 'USUARIO',
      activo: true,
    },
    create: {
      nombre: 'María',
      apellido: 'González',
      email: 'docente@instituto.edu.ar',
      dni: '00000002',
      passwordHash: userPasswordHash,
      rol: 'USUARIO',
      activo: true,
    },
  });
  console.log(`Usuario docente asegurado: ${docente.email} (Rol: ${docente.rol})`);

  // 3. Usuario Alumno / Estándar
  const alumno = await prisma.usuario.upsert({
    where: { email: 'alumno@instituto.edu.ar' },
    update: {
      rol: 'USUARIO',
      activo: true,
    },
    create: {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'alumno@instituto.edu.ar',
      dni: '00000003',
      passwordHash: userPasswordHash,
      rol: 'USUARIO',
      activo: true,
    },
  });
  console.log(`Usuario alumno asegurado: ${alumno.email} (Rol: ${alumno.rol})`);

  // 4. Usuario Inactivo (para pruebas de soft-delete y reactivación)
  const inactivo = await prisma.usuario.upsert({
    where: { email: 'inactivo@instituto.edu.ar' },
    update: {
      rol: 'USUARIO',
      activo: false,
    },
    create: {
      nombre: 'Usuario',
      apellido: 'Desactivado',
      email: 'inactivo@instituto.edu.ar',
      dni: '00000004',
      passwordHash: userPasswordHash,
      rol: 'USUARIO',
      activo: false,
    },
  });
  console.log(`Usuario inactivo asegurado: ${inactivo.email} (Activo: ${inactivo.activo})`);

  console.log('Carga de datos iniciales completada con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
