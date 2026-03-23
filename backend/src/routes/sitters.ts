import { and, count, eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../models/db.js';
import { sessions, sitters } from '../models/schema.js';
import { authenticateUser } from '../utils/auth-middleware.js';
import { parseWithSchema } from '../utils/validate.js';

const createSitterSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  bio: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  location: z.string().trim().max(120).optional(),
});

const updateSitterSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    profileImage: z.string().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const sitterIdParamsSchema = z.object({
  id: z.string().uuid(),
});

async function getCurrentSitter(firebaseUid: string) {
  const [sitter] = await db.select().from(sitters).where(eq(sitters.firebaseUid, firebaseUid)).limit(1);
  return sitter ?? null;
}

const sitterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/sitters', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const body = parseWithSchema(createSitterSchema, request.body);

    if (user.email && body.email !== user.email) {
      return reply.code(400).send({ error: 'Email must match the authenticated user' });
    }

    const now = new Date();

    const [sitter] = await db
      .insert(sitters)
      .values({
        firebaseUid: user.uid,
        email: user.email,
        name: body.name,
        bio: body.bio,
        phone: body.phone,
        location: body.location,
        profileImage: user.photoURL,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sitters.firebaseUid,
        set: {
          email: user.email,
          name: body.name,
          bio: body.bio,
          phone: body.phone,
          location: body.location,
          profileImage: user.photoURL,
          updatedAt: now,
        },
      })
      .returning();

    return reply.code(201).send(sitter);
  });

  fastify.get('/api/sitters/me', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    return sitter;
  });

  fastify.patch('/api/sitters/me', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existingSitter = await getCurrentSitter(user.uid);

    if (!existingSitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const body = parseWithSchema(updateSitterSchema, request.body);

    const [updatedSitter] = await db
      .update(sitters)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(sitters.id, existingSitter.id))
      .returning();

    return updatedSitter;
  });

  fastify.get('/api/sitters/:id', async (request, reply) => {
    const { id } = parseWithSchema(sitterIdParamsSchema, request.params, 'Invalid sitter id');

    const [sitter] = await db
      .select({
        name: sitters.name,
        bio: sitters.bio,
        location: sitters.location,
        profileImage: sitters.profileImage,
      })
      .from(sitters)
      .where(and(eq(sitters.id, id), eq(sitters.isActive, true)))
      .limit(1);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter not found' });
    }

    const [counts] = await db
      .select({
        publicSessionCount: count(),
      })
      .from(sessions)
      .where(and(eq(sessions.sitterId, id), eq(sessions.isPublic, true), eq(sessions.isActive, true)));

    return {
        ...sitter,
        publicSessionCount: counts.publicSessionCount,
    };
  });
};

export default sitterRoutes;
