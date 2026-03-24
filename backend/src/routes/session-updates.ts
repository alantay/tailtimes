import { and, desc, eq, sql } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../models/db.js';
import { sessionStats, sessions, sitters, updates } from '../models/schema.js';
import { CloudinaryService } from '../services/cloudinary.js';
import type { SessionUpdate, SessionUpdateTag } from '../types/api.js';
import { authenticateUser } from '../utils/auth-middleware.js';
import { parseWithSchema } from '../utils/validate.js';

const sessionUpdateTags = ['walks', 'food', 'lounging', 'sleeping', 'misc'] as const;

function parseUpdateTag(value: unknown): SessionUpdateTag | null {
  if (typeof value !== 'string') {
    return null;
  }

  return sessionUpdateTags.includes(value as (typeof sessionUpdateTags)[number])
    ? (value as SessionUpdateTag)
    : null;
}

function getUpdateTags(metadata: unknown): SessionUpdateTag[] | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  if ('tags' in metadata && Array.isArray(metadata.tags)) {
    const tags = metadata.tags
      .map((value) => parseUpdateTag(value))
      .filter((value): value is SessionUpdateTag => Boolean(value));

    return tags.length > 0 ? [...new Set(tags)] : null;
  }

  if ('tag' in metadata) {
    const tag = parseUpdateTag(metadata.tag);
    return tag ? [tag] : null;
  }

  return null;
}

function toSessionUpdate(record: {
  id: string;
  sessionId: string;
  type: string;
  mediaUrl: string | null;
  caption: string | null;
  metadata: unknown;
  createdAt: Date;
}): SessionUpdate {
  return {
    id: record.id,
    sessionId: record.sessionId,
    type: record.type === 'video' ? 'video' : 'photo',
    mediaUrl: record.mediaUrl ?? '',
    caption: record.caption,
    tags: getUpdateTags(record.metadata),
    metadata:
      record.metadata && typeof record.metadata === 'object'
        ? (record.metadata as Record<string, unknown>)
        : null,
    createdAt: record.createdAt.toISOString(),
  };
}

const sessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateParamsSchema = z.object({
  sessionId: z.string().uuid(),
  updateId: z.string().uuid(),
});

const createSessionUpdateSchema = z.object({
  cloudinaryPublicId: z.string().trim().min(1),
  mediaUrl: z.string().url(),
  type: z.enum(['photo', 'video']),
  caption: z.string().trim().max(500).optional(),
  tags: z.array(z.enum(sessionUpdateTags)).max(5).optional(),
  metadata: z.record(z.unknown()).optional(),
});

async function getCurrentSitter(firebaseUid: string) {
  const [sitter] = await db.select().from(sitters).where(eq(sitters.firebaseUid, firebaseUid)).limit(1);
  return sitter ?? null;
}

async function getOwnedSession(sessionId: string, sitterId: string) {
  const [session] = await db
    .select({
      id: sessions.id,
      sitterId: sessions.sitterId,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.sitterId, sitterId)))
    .limit(1);

  return session ?? null;
}

const sessionUpdateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/sessions/:id/updates', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const { id } = parseWithSchema(sessionIdParamsSchema, request.params, 'Invalid session id');
    const session = await getOwnedSession(id, sitter.id);

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    const body = parseWithSchema(createSessionUpdateSchema, request.body);
    const now = new Date();

    const [createdUpdate] = await db.transaction(async (tx) => {
      const [newUpdate] = await tx
        .insert(updates)
        .values({
          sessionId: id,
          type: body.type,
          mediaUrl: body.mediaUrl,
          caption: body.caption,
          metadata: {
            ...body.metadata,
            cloudinaryPublicId: body.cloudinaryPublicId,
            ...(body.tags && body.tags.length > 0 ? { tags: [...new Set(body.tags)] } : {}),
          },
          createdAt: now,
        })
        .returning();

      await tx
        .update(sessionStats)
        .set({
          totalUpdates: sql`coalesce(${sessionStats.totalUpdates}, 0) + 1`,
          totalPhotos:
            body.type === 'photo' ? sql`coalesce(${sessionStats.totalPhotos}, 0) + 1` : undefined,
          totalVideos:
            body.type === 'video' ? sql`coalesce(${sessionStats.totalVideos}, 0) + 1` : undefined,
          lastUpdateAt: now,
          updatedAt: now,
        })
        .where(eq(sessionStats.sessionId, id));

      return [newUpdate];
    });

    return reply.code(201).send({
      id: createdUpdate.id,
      mediaUrl: createdUpdate.mediaUrl,
      thumbnailUrl: CloudinaryService.generateThumbnail(body.cloudinaryPublicId),
      type: createdUpdate.type,
      caption: createdUpdate.caption,
      tags: getUpdateTags(createdUpdate.metadata),
      createdAt: createdUpdate.createdAt,
    });
  });

  fastify.get('/api/sessions/:id/updates', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const { id } = parseWithSchema(sessionIdParamsSchema, request.params, 'Invalid session id');
    const session = await getOwnedSession(id, sitter.id);

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    const sessionUpdates = await db
      .select({
        id: updates.id,
        sessionId: updates.sessionId,
        type: updates.type,
        mediaUrl: updates.mediaUrl,
        caption: updates.caption,
        metadata: updates.metadata,
        createdAt: updates.createdAt,
      })
      .from(updates)
      .where(eq(updates.sessionId, id))
      .orderBy(desc(updates.createdAt));

    return sessionUpdates.map(toSessionUpdate);
  });

  fastify.delete(
    '/api/sessions/:sessionId/updates/:updateId',
    { preHandler: authenticateUser },
    async (request, reply) => {
      const user = request.user;

      if (!user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      const sitter = await getCurrentSitter(user.uid);

      if (!sitter) {
        return reply.code(404).send({ error: 'Sitter profile not found' });
      }

      const { sessionId, updateId } = parseWithSchema(
        updateParamsSchema,
        request.params,
        'Invalid session update params'
      );
      const session = await getOwnedSession(sessionId, sitter.id);

      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      const [existingUpdate] = await db
        .select({
          id: updates.id,
          type: updates.type,
          metadata: updates.metadata,
        })
        .from(updates)
        .where(and(eq(updates.id, updateId), eq(updates.sessionId, sessionId)))
        .limit(1);

      if (!existingUpdate) {
        return reply.code(404).send({ error: 'Update not found' });
      }

      const cloudinaryPublicId =
        existingUpdate.metadata &&
        typeof existingUpdate.metadata === 'object' &&
        'cloudinaryPublicId' in existingUpdate.metadata &&
        typeof existingUpdate.metadata.cloudinaryPublicId === 'string'
          ? existingUpdate.metadata.cloudinaryPublicId
          : null;

      await db.transaction(async (tx) => {
        await tx.delete(updates).where(eq(updates.id, updateId));

        await tx
          .update(sessionStats)
          .set({
            totalUpdates: sql`greatest(coalesce(${sessionStats.totalUpdates}, 0) - 1, 0)`,
            totalPhotos:
              existingUpdate.type === 'photo'
                ? sql`greatest(coalesce(${sessionStats.totalPhotos}, 0) - 1, 0)`
                : undefined,
            totalVideos:
              existingUpdate.type === 'video'
                ? sql`greatest(coalesce(${sessionStats.totalVideos}, 0) - 1, 0)`
                : undefined,
            updatedAt: new Date(),
          })
          .where(eq(sessionStats.sessionId, sessionId));
      });

      if (cloudinaryPublicId) {
        await CloudinaryService.deleteMedia(cloudinaryPublicId);
      }

      return reply.code(204).send();
    }
  );
};

export default sessionUpdateRoutes;
