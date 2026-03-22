/**
 * Media routes — supports the direct-upload flow.
 *
 * Upload flow:
 *   1. Mobile calls GET /api/media/sign  → gets a signed Cloudinary upload preset
 *   2. Mobile uploads file directly to Cloudinary
 *   3. On success, mobile calls POST /api/media with the Cloudinary result + session metadata
 *   4. Backend stores the URL in the updates table and bumps session_stats
 */

import { FastifyPluginAsync } from 'fastify';
import { CloudinaryService } from '../services/cloudinary.js';
import { authenticateUser } from '../utils/auth-middleware.js';
import { z } from 'zod';

const storeMediaSchema = z.object({
  sessionId: z.string().uuid(),
  cloudinaryPublicId: z.string(),
  mediaUrl: z.string().url(),
  type: z.enum(['photo', 'video']),
  caption: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).optional(),
});

const mediaRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/media/sign — returns a signed upload signature for direct Cloudinary upload
  fastify.get('/api/media/sign', { preHandler: authenticateUser }, async (request, reply) => {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = CloudinaryService.generateSignature({ timestamp });

      return {
        success: true,
        data: {
          signature,
          timestamp,
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY,
        },
      };
    } catch (error) {
      fastify.log.error({ error }, 'Signature generation error');
      return reply.code(500).send({ error: 'Could not generate upload signature' });
    }
  });

  // POST /api/media — store Cloudinary URL after a successful direct upload
  fastify.post('/api/media', { preHandler: authenticateUser }, async (request, reply) => {
    try {
      const parsed = storeMediaSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const { sessionId, cloudinaryPublicId, mediaUrl, type, caption, isPublic, metadata } = parsed.data;

      // Session ownership is validated in the session-updates route.
      // This endpoint is intentionally thin — session routes handle the DB writes.
      // Kept here only for the signature endpoint co-location.
      return reply.code(501).send({
        error: 'Use POST /api/sessions/:id/updates to store an update after direct upload',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Media store error');
      return reply.code(500).send({ error: 'Failed to store media record' });
    }
  });

  // DELETE /api/media/:publicId — remove media from Cloudinary (called when deleting an update)
  fastify.delete('/api/media/:publicId', { preHandler: authenticateUser }, async (request, reply) => {
    try {
      const { publicId } = request.params as { publicId: string };
      const success = await CloudinaryService.deleteMedia(publicId);

      if (!success) {
        return reply.code(404).send({ error: 'Media not found or already deleted' });
      }

      return { success: true, message: 'Media deleted successfully' };
    } catch (error) {
      fastify.log.error({ error }, 'Delete error');
      return reply.code(500).send({ error: 'Delete failed' });
    }
  });
};

export default mediaRoutes;
