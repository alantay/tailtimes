import { desc, eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../models/db.js';
import { sessions, sitters, updates } from '../models/schema.js';
import type { PublicSessionFeed, PublicSessionUpdate, SessionUpdateTag } from '../types/api.js';
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

function toPublicSessionUpdate(record: {
  id: string;
  type: string;
  mediaUrl: string | null;
  caption: string | null;
  metadata: unknown;
  createdAt: Date;
}): PublicSessionUpdate {
  return {
    id: record.id,
    type: record.type === 'video' ? 'video' : 'photo',
    mediaUrl: record.mediaUrl ?? '',
    caption: record.caption,
    tags: getUpdateTags(record.metadata),
    createdAt: record.createdAt.toISOString(),
  };
}

const shareLinkParamsSchema = z.object({
  shareLink: z.string().trim().min(1),
});

const ownerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/share/:shareLink', async (request, reply) => {
    const { shareLink } = parseWithSchema(shareLinkParamsSchema, request.params, 'Invalid share link');

    const [session] = await db
      .select({
        petName: sessions.petName,
        petType: sessions.petType,
        ownerName: sessions.ownerName,
        startDate: sessions.startDate,
        endDate: sessions.endDate,
        isActive: sessions.isActive,
        sitterName: sitters.name,
        sitterProfileImage: sitters.profileImage,
      })
      .from(sessions)
      .innerJoin(sitters, eq(sitters.id, sessions.sitterId))
      .where(eq(sessions.shareLink, shareLink))
      .limit(1);

    if (!session) {
      return reply.code(404).send({ error: 'Shared session not found' });
    }

    if (!session.isActive) {
      return reply.code(404).send({ error: 'Shared session not found' });
    }

    const sharedUpdates = await db
      .select({
        id: updates.id,
        type: updates.type,
        mediaUrl: updates.mediaUrl,
        caption: updates.caption,
        metadata: updates.metadata,
        createdAt: updates.createdAt,
      })
      .from(updates)
      .innerJoin(sessions, eq(sessions.id, updates.sessionId))
      .where(eq(sessions.shareLink, shareLink))
      .orderBy(desc(updates.createdAt));

    const response: PublicSessionFeed = {
      session: {
        petName: session.petName,
        petType: session.petType,
        ownerName: session.ownerName,
        startDate: session.startDate.toISOString(),
        endDate: session.endDate?.toISOString() ?? null,
      },
      sitter: {
        name: session.sitterName,
        profileImage: session.sitterProfileImage,
      },
      updates: sharedUpdates.map(toPublicSessionUpdate),
    };

    return response;
  });
};

export default ownerRoutes;
