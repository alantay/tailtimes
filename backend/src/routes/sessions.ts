import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../models/db.js';
import { sessionStats, sessions, sitters, updates } from '../models/schema.js';
import type { SessionDetail, SessionStatus, SessionSummary, SessionUpdate, SessionUpdateTag } from '../types/api.js';
import { authenticateUser } from '../utils/auth-middleware.js';
import { parseWithSchema } from '../utils/validate.js';

const sessionUpdateTags = ['walks', 'food', 'lounging', 'sleeping', 'misc'] as const;

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

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

const createSessionSchema = z.object({
  petName: z.string().trim().min(1),
  petType: z.string().trim().min(1).max(40),
  ownerName: z.string().trim().min(1),
  ownerContact: z.string().trim().max(120).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().trim().max(1000).optional(),
}).superRefine((value, ctx) => {
  const startDate = new Date(value.startDate);
  const endDate = new Date(value.endDate);

  if (endDate < startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be on or after start date',
    });
  }
});

const updateSessionSchema = z
  .object({
    endDate: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const sessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

async function getCurrentSitter(firebaseUid: string) {
  const [sitter] = await db.select().from(sitters).where(eq(sitters.firebaseUid, firebaseUid)).limit(1);
  return sitter ?? null;
}

async function generateUniqueShareLink() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareLink = randomBytes(8).toString('hex');
    const [existingSession] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.shareLink, shareLink))
      .limit(1);

    if (!existingSession) {
      return shareLink;
    }
  }

  throw new Error('Could not generate a unique share link');
}

async function getOwnedSession(sessionId: string, sitterId: string) {
  const [session] = await db
    .select({
      id: sessions.id,
      sitterId: sessions.sitterId,
      petName: sessions.petName,
      petType: sessions.petType,
      ownerName: sessions.ownerName,
      ownerContact: sessions.ownerContact,
      startDate: sessions.startDate,
      endDate: sessions.endDate,
      shareLink: sessions.shareLink,
      isActive: sessions.isActive,
      notes: sessions.notes,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      totalUpdates: sessionStats.totalUpdates,
      totalPhotos: sessionStats.totalPhotos,
      totalVideos: sessionStats.totalVideos,
      lastUpdateAt: sessionStats.lastUpdateAt,
    })
    .from(sessions)
    .leftJoin(sessionStats, eq(sessionStats.sessionId, sessions.id))
    .where(and(eq(sessions.id, sessionId), eq(sessions.sitterId, sitterId)))
    .limit(1);

  return session ?? null;
}

function formatSession(record: Awaited<ReturnType<typeof getOwnedSession>>): SessionSummary | null {
  if (!record) {
    return null;
  }

  const status = computeSessionStatus(record.startDate, record.endDate, record.isActive ?? false);

  return {
    id: record.id,
    sitterId: record.sitterId,
    petName: record.petName,
    petType: record.petType,
    ownerName: record.ownerName,
    ownerContact: record.ownerContact,
    startDate: record.startDate.toISOString(),
    endDate: toIsoString(record.endDate),
    shareLink: record.shareLink,
    isActive: record.isActive ?? false,
    status,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    stats: {
      totalUpdates: record.totalUpdates ?? 0,
      totalPhotos: record.totalPhotos ?? 0,
      totalVideos: record.totalVideos ?? 0,
      lastUpdateAt: toIsoString(record.lastUpdateAt),
    },
  };
}

function getUtcDayValue(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function computeSessionStatus(
  startDate: Date,
  endDate: Date | null,
  isActive: boolean
): SessionStatus {
  if (!isActive) {
    return 'ended';
  }

  const today = new Date();
  const todayValue = getUtcDayValue(today);
  const startValue = getUtcDayValue(startDate);
  const endValue = endDate ? getUtcDayValue(endDate) : null;

  if (todayValue < startValue) {
    return 'upcoming';
  }

  if (endValue !== null && todayValue > endValue) {
    return 'ended';
  }

  return 'live';
}

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/sessions', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const body = parseWithSchema(createSessionSchema, request.body);
    const now = new Date();
    const shareLink = await generateUniqueShareLink();

    const session = await db.transaction(async (tx) => {
      const [createdSession] = await tx
        .insert(sessions)
        .values({
          sitterId: sitter.id,
          petName: body.petName,
          petType: body.petType,
          ownerName: body.ownerName,
          ownerContact: body.ownerContact,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          shareLink,
          notes: body.notes,
          updatedAt: now,
        })
        .returning();

      await tx.insert(sessionStats).values({
        sessionId: createdSession.id,
        totalUpdates: 0,
        totalPhotos: 0,
        totalVideos: 0,
        updatedAt: now,
      });

      return createdSession;
    });

    const sessionWithStats = await getOwnedSession(session.id, sitter.id);

    return reply.code(201).send(formatSession(sessionWithStats));
  });

  fastify.get('/api/sessions', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const records = await db
      .select({
        id: sessions.id,
        sitterId: sessions.sitterId,
        petName: sessions.petName,
        petType: sessions.petType,
        ownerName: sessions.ownerName,
        ownerContact: sessions.ownerContact,
        startDate: sessions.startDate,
        endDate: sessions.endDate,
        shareLink: sessions.shareLink,
        isActive: sessions.isActive,
        notes: sessions.notes,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        totalUpdates: sessionStats.totalUpdates,
        totalPhotos: sessionStats.totalPhotos,
        totalVideos: sessionStats.totalVideos,
        lastUpdateAt: sessionStats.lastUpdateAt,
      })
      .from(sessions)
      .leftJoin(sessionStats, eq(sessionStats.sessionId, sessions.id))
      .where(eq(sessions.sitterId, sitter.id))
      .orderBy(desc(sessions.createdAt));

    return records.map((record) => formatSession(record) as SessionSummary);
  });

  fastify.get('/api/sessions/:id', { preHandler: authenticateUser }, async (request, reply) => {
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

    const response: SessionDetail = {
      ...(formatSession(session) as SessionSummary),
      updates: sessionUpdates.map(toSessionUpdate),
    };

    return response;
  });

  fastify.patch('/api/sessions/:id', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const { id } = parseWithSchema(sessionIdParamsSchema, request.params, 'Invalid session id');
    const existingSession = await getOwnedSession(id, sitter.id);

    if (!existingSession) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    const body = parseWithSchema(updateSessionSchema, request.body);

    await db
      .update(sessions)
      .set({
        endDate: body.endDate === undefined ? undefined : body.endDate ? new Date(body.endDate) : null,
        notes: body.notes,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    const updatedSession = await getOwnedSession(id, sitter.id);
    return formatSession(updatedSession);
  });

  fastify.delete('/api/sessions/:id', { preHandler: authenticateUser }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const sitter = await getCurrentSitter(user.uid);

    if (!sitter) {
      return reply.code(404).send({ error: 'Sitter profile not found' });
    }

    const { id } = parseWithSchema(sessionIdParamsSchema, request.params, 'Invalid session id');
    const existingSession = await getOwnedSession(id, sitter.id);

    if (!existingSession) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    await db
      .update(sessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    return reply.code(204).send();
  });
};

export default sessionRoutes;
