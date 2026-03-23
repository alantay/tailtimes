import 'dotenv/config';
import { db } from '../models/db.js';
import { sessionStats, sessions, sitters, updates } from '../models/schema.js';

const SAMPLE_IDS = {
  sitter: '11111111-1111-4111-8111-111111111111',
  session: '22222222-2222-4222-8222-222222222222',
  firstUpdate: '33333333-3333-4333-8333-333333333333',
  secondUpdate: '44444444-4444-4444-8444-444444444444',
  stats: '55555555-5555-4555-8555-555555555555',
} as const;

const SHARE_LINK = 'demo-golden-retriever-weekend';

async function main() {
  const now = new Date();
  const startDate = new Date('2026-03-20T09:00:00.000Z');
  const firstUpdateAt = new Date('2026-03-20T10:15:00.000Z');
  const secondUpdateAt = new Date('2026-03-20T14:45:00.000Z');
  const sampleSitter = {
    id: SAMPLE_IDS.sitter,
    firebaseUid: 'firebase-demo-sitter',
    name: 'Demo Sitter',
    email: 'demo@tailtimes.app',
    phone: '+1-555-0100',
    bio: 'Weekend boarding specialist who shares frequent photo updates.',
    location: 'San Francisco, CA',
    profileImage: 'https://res.cloudinary.com/demo/image/upload/v1/tailtimes/sitters/demo-sitter.jpg',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as const;
  const sampleSession = {
    id: SAMPLE_IDS.session,
    sitterId: SAMPLE_IDS.sitter,
    petName: 'Mochi',
    petType: 'dog',
    ownerName: 'Jamie Chen',
    ownerContact: '+1-555-0188',
    startDate,
    endDate: null,
    shareLink: SHARE_LINK,
    isActive: true,
    isPublic: false,
    notes: 'Loves fetch, naps after lunch, and gets anxious during thunderstorms.',
    createdAt: now,
    updatedAt: now,
  } as const;
  const sampleUpdates = [
    {
      id: SAMPLE_IDS.firstUpdate,
      sessionId: SAMPLE_IDS.session,
      type: 'photo' as const,
      mediaUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/tailtimes/sessions/mochi/morning-walk.jpg',
      caption: 'Morning walk done. Mochi found every patch of sunshine.',
      metadata: {
        cloudinaryPublicId: 'tailtimes/sessions/mochi/morning-walk',
        width: 1600,
        height: 1200,
        format: 'jpg',
      },
      isPublic: false,
      createdAt: firstUpdateAt,
    },
    {
      id: SAMPLE_IDS.secondUpdate,
      sessionId: SAMPLE_IDS.session,
      type: 'video' as const,
      mediaUrl:
        'https://res.cloudinary.com/demo/video/upload/v1/tailtimes/sessions/mochi/playtime.mp4',
      caption: 'Afternoon playtime and zoomies in the yard.',
      metadata: {
        cloudinaryPublicId: 'tailtimes/sessions/mochi/playtime',
        duration: 18,
        format: 'mp4',
      },
      isPublic: true,
      createdAt: secondUpdateAt,
    },
  ];

  await db.transaction(async (tx) => {
    await tx
      .insert(sitters)
      .values(sampleSitter)
      .onConflictDoUpdate({
        target: sitters.id,
        set: {
          firebaseUid: sampleSitter.firebaseUid,
          name: sampleSitter.name,
          email: sampleSitter.email,
          phone: sampleSitter.phone,
          bio: sampleSitter.bio,
          location: sampleSitter.location,
          profileImage: sampleSitter.profileImage,
          isActive: sampleSitter.isActive,
          updatedAt: now,
        },
      });

    await tx
      .insert(sessions)
      .values(sampleSession)
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          sitterId: sampleSession.sitterId,
          petName: sampleSession.petName,
          petType: sampleSession.petType,
          ownerName: sampleSession.ownerName,
          ownerContact: sampleSession.ownerContact,
          startDate: sampleSession.startDate,
          endDate: sampleSession.endDate,
          shareLink: sampleSession.shareLink,
          isActive: sampleSession.isActive,
          isPublic: sampleSession.isPublic,
          notes: sampleSession.notes,
          updatedAt: now,
        },
      });

    for (const sampleUpdate of sampleUpdates) {
      await tx
        .insert(updates)
        .values(sampleUpdate)
        .onConflictDoUpdate({
          target: updates.id,
          set: {
            sessionId: sampleUpdate.sessionId,
            type: sampleUpdate.type,
            mediaUrl: sampleUpdate.mediaUrl,
            caption: sampleUpdate.caption,
            metadata: sampleUpdate.metadata,
            isPublic: sampleUpdate.isPublic,
            createdAt: sampleUpdate.createdAt,
          },
        });
    }

    await tx
      .insert(sessionStats)
      .values({
        id: SAMPLE_IDS.stats,
        sessionId: SAMPLE_IDS.session,
        totalUpdates: 2,
        totalPhotos: 1,
        totalVideos: 1,
        lastUpdateAt: secondUpdateAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sessionStats.id,
        set: {
          totalUpdates: 2,
          totalPhotos: 1,
          totalVideos: 1,
          lastUpdateAt: secondUpdateAt,
          updatedAt: now,
        },
      });
  });

  console.log(
    `Seeded demo data: sitter=${SAMPLE_IDS.sitter}, session=${SAMPLE_IDS.session}, shareLink=${SHARE_LINK}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exit(1);
  });
