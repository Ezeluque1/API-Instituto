import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Render (y cualquier PaaS) corre la app detras de un proxy: sin esto `req.ip`
// y morgan registran la IP del proxy en vez de la del cliente real.
app.set('trust proxy', 1);

// Seguridad y logging
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// Parseo del body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api', routes);

// 404 y manejo de errores: siempre al final, en este orden.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
