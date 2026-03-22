import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'development' ? true : ['https://tailtimes.vercel.app'],
  credentials: true
});

await fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 5 // Max 5 files per upload
  }
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/', async (request, reply) => {
  return { 
    message: 'TailTimes API',
    version: '1.0.0',
    docs: '/docs'
  };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 TailTimes API running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();