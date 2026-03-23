import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import mediaRoutes from './routes/uploads.js';
import sitterRoutes from './routes/sitters.js';
import sessionRoutes from './routes/sessions.js';
import sessionUpdateRoutes from './routes/session-updates.js';
import ownerRoutes from './routes/owner.js';
import { RequestValidationError } from './utils/validate.js';

export function buildServer() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    }
  });

  fastify.register(cors, {
    origin: process.env.NODE_ENV === 'development' ? true : ['https://tailtimes.vercel.app'],
    credentials: true
  });

  fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
      files: 5 // Max 5 files per upload
    }
  });

  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/', async () => {
    return {
      message: 'TailTimes API',
      version: '1.0.0',
      docs: '/docs'
    };
  });

  fastify.register(mediaRoutes);
  fastify.register(sitterRoutes);
  fastify.register(sessionRoutes);
  fastify.register(sessionUpdateRoutes);
  fastify.register(ownerRoutes);

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof RequestValidationError) {
      return reply.code(error.statusCode).send({
        error: error.message,
        details: error.details,
      });
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Invalid request payload',
        details: error.flatten(),
      });
    }

    request.log.error({ error }, 'Unhandled request error');

    if (reply.sent) {
      return;
    }

    return reply.code(500).send({
      error: 'Internal server error',
    });
  });

  return fastify;
}

const start = async () => {
  const fastify = buildServer();

  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`TailTimes API running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}
