# API Instituto

Backend REST con **Node.js + Express 5 + Prisma 6 + PostgreSQL**, en ESM y organizado por capas.

## Requisitos

- Node.js 22+
- PostgreSQL 16/17

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Crear la base de datos
#    (si `psql` no esta en el PATH, usar la ruta completa de la instalacion)
"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres instituto

# 3. Configurar el entorno
cp .env.example .env
#    y completar DATABASE_URL con tu usuario/password

# 4. Crear las tablas y generar el cliente de Prisma
npx prisma migrate dev --name init

# 5. Levantar en desarrollo (recarga automatica)
npm run dev
```

Comprobacion rapida: `GET http://localhost:3000/api/health`.

## Scripts

| Script | Que hace |
|---|---|
| `npm run dev` | Levanta con recarga automatica (`node --watch`, sin nodemon) |
| `npm start` | Levanta en modo produccion |
| `npm run prisma:migrate` | Crea y aplica una migracion |
| `npm run prisma:generate` | Regenera el cliente de Prisma |
| `npm run prisma:studio` | Abre el explorador visual de la base |

## Variables de entorno

| Variable | Descripcion | Default |
|---|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` | `development` |
| `PORT` | Puerto de la API | `3000` |
| `DATABASE_URL` | Cadena de conexion a PostgreSQL | — (obligatoria) |
| `JWT_SECRET` | Secreto para firmar los tokens (min. 16 caracteres) | — (obligatoria) |
| `JWT_EXPIRES_IN` | Duracion del token | `1d` |
| `CORS_ORIGIN` | `*` o lista de origenes separada por comas | `*` |

`src/config/env.js` las valida con Zod al arrancar: si falta alguna, el proceso
muere con un mensaje claro en vez de fallar despues con un `undefined`.

## Estructura

```
src/
├── controllers/   Leen la request, llaman al service, arman la response
├── models/        Schemas de Zod + `select` de Prisma reutilizables
├── routes/        Definen endpoints y encadenan middlewares
├── services/      Logica de negocio + consultas Prisma
├── middlewares/   Errores, validacion, autenticacion
├── config/        Variables de entorno y cliente de Prisma
├── utils/         ApiError, JWT, hashing de passwords
├── app.js         Arma la app de Express y la exporta
└── server.js      Hace el listen() y el apagado ordenado
```

Los **modelos de datos** viven en `prisma/schema.prisma` (esa es la fuente de
verdad de Prisma). La carpeta `src/models/` guarda los schemas de Zod y los
`select` reutilizables de cada entidad.

## Como agregar un recurso nuevo

Los modelos ya estan definidos en `prisma/schema.prisma`. Ejemplo con `Sede`,
recorriendo las 5 capas:

**1. `src/models/sede.model.js`** — validacion (Zod) y campos expuestos:

```js
import { z } from 'zod';

export const sedePublicSelect = {
  id: true, nombre: true, ciudad: true, provincia: true,
  direccion: true, telefono: true, email: true,
};

export const crearSedeSchema = z.object({
  nombre: z.string().min(1),
  ciudad: z.string().min(1),
  provincia: z.string().min(1),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.email().optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });
```

**2. `src/services/sede.service.js`** — logica de negocio y acceso a datos:

```js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { sedePublicSelect } from '../models/sede.model.js';

export async function listar() {
  return prisma.sede.findMany({ select: sedePublicSelect, orderBy: { nombre: 'asc' } });
}

export async function obtenerPorId(id) {
  const sede = await prisma.sede.findUnique({ where: { id }, select: sedePublicSelect });
  if (!sede) throw ApiError.notFound('Sede no encontrada');
  return sede;
}

export async function crear(datos) {
  return prisma.sede.create({ data: datos, select: sedePublicSelect });
}
```

**3. `src/controllers/sede.controller.js`** — fino, sin logica de negocio:

```js
import * as sedeService from '../services/sede.service.js';

export async function listar(_req, res) {
  res.json({ success: true, data: await sedeService.listar() });
}

export async function crear(req, res) {
  res.status(201).json({ success: true, data: await sedeService.crear(req.body) });
}
```

**4. `src/routes/sede.routes.js`** — endpoints y middlewares:

```js
import { Router } from 'express';
import * as controller from '../controllers/sede.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { crearSedeSchema } from '../models/sede.model.js';

const router = Router();

router.get('/', controller.listar);
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: crearSedeSchema }),
  controller.crear,
);

export default router;
```

**5. `src/routes/index.js`** — montarlo:

```js
import sedeRoutes from './sede.routes.js';
router.use('/sedes', sedeRoutes);
```

Si ademas cambias `prisma/schema.prisma`, correr `npm run prisma:migrate` para
generar la migracion y commitear la carpeta `prisma/migrations/`: es lo que
Render aplica en produccion.

## Deploy (Render)

El servicio esta configurado a mano en el dashboard de Render. Cada push a
`main` dispara un deploy automatico.

| Campo | Valor |
|---|---|
| Runtime | Node |
| Build Command | `npm ci && npx prisma generate && npx prisma migrate deploy` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Variables de entorno en Render: `NODE_ENV=production`, `DATABASE_URL` (Internal
Database URL de la base de Render), `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`.
**`PORT` no se define**: Render la inyecta sola.

Cosas a tener en cuenta con el plan free:

- El servicio **se duerme tras 15 minutos sin trafico**; el primer request
  despues tarda ~50 segundos. No es un bug.
- La **base free de Render se elimina a los 30 dias de creada.** Hay que migrar
  a un plan pago (o a Neon/Supabase) antes de esa fecha o se pierden los datos.
- La **Internal** Database URL solo funciona dentro de Render. Para correr
  `prisma studio` o migraciones desde tu maquina, usar la **External** URL.

## Notas

- **Express 5** propaga automaticamente los errores de los handlers `async` al
  `errorHandler`, asi que no hace falta envolverlos en un `asyncHandler`.
- **`req.query` es de solo lectura en Express 5.** El middleware `validate()`
  deja lo parseado en `req.validated.query` en lugar de sobrescribirlo.
- El manejo de errores esta centralizado en `src/middlewares/error.middleware.js`:
  desde un service alcanza con `throw ApiError.notFound(...)`. Ademas traduce los
  codigos de Prisma (`P2002` → 409, `P2025` → 404).
- Para emitir tokens, firmar con el id del usuario en `sub`:
  `signToken({ sub: usuario.id, rol: usuario.rol })`, que es lo que espera
  `authenticate`. Ese middleware relee el `Usuario` de la base en cada request y
  rechaza con 401 si esta `activo: false` (soft delete).
- Los ids del schema son `String` con `@default(cuid())`, no enteros: validar los
  path params con `z.string().cuid()`.
