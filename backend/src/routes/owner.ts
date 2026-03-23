import { asc, eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../models/db.js';
import { sessions, sitters, updates } from '../models/schema.js';
import { parseWithSchema } from '../utils/validate.js';

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
        type: updates.type,
        mediaUrl: updates.mediaUrl,
        caption: updates.caption,
        createdAt: updates.createdAt,
      })
      .from(updates)
      .innerJoin(sessions, eq(sessions.id, updates.sessionId))
      .where(eq(sessions.shareLink, shareLink))
      .orderBy(asc(updates.createdAt));

    return {
      session: {
        petName: session.petName,
        petType: session.petType,
        ownerName: session.ownerName,
        startDate: session.startDate,
        endDate: session.endDate,
      },
      sitter: {
        name: session.sitterName,
        profileImage: session.sitterProfileImage,
      },
      updates: sharedUpdates,
    };
  });
};

export default ownerRoutes;
