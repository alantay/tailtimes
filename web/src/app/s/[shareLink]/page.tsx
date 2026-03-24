/**
 * Owner session feed — publicly accessible via share link.
 * No login required. Fetches data server-side for fast first load.
 *
 * URL: https://tailtimes.app/s/<shareLink>
 * Backend: GET /api/share/:shareLink
 */

import { notFound } from 'next/navigation';
import type { PublicSessionFeed } from '@tailtimes/shared';

async function getSessionFeed(shareLink: string): Promise<PublicSessionFeed | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/share/${shareLink}`, {
    next: { revalidate: 30 }, // revalidate every 30 seconds
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export default async function OwnerFeedPage({
  params,
}: {
  params: { shareLink: string };
}) {
  const feed = await getSessionFeed(params.shareLink);
  if (!feed) notFound();

  const { session, sitter, updates } = feed;
  const startDate = new Date(session.startDate).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endDate = session.endDate
    ? new Date(session.endDate).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Ongoing stay';

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 88px' }}>
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
          padding: '28px 24px',
          background:
            'linear-gradient(135deg, rgba(26, 127, 90, 0.98), rgba(20, 83, 45, 0.96) 62%, rgba(12, 58, 34, 0.96))',
          color: '#f8fafc',
          boxShadow: '0 24px 70px rgba(22, 101, 52, 0.18)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -56,
            top: -64,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -48,
            bottom: -72,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(254, 240, 138, 0.14)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(236, 253, 245, 0.82)',
            }}
          >
            TailTimes owner feed
          </p>
          <h1 style={{ margin: '12px 0 10px', fontSize: 40, lineHeight: 1.02, fontWeight: 800 }}>
            {session.petName}&apos;s live updates
          </h1>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 17, lineHeight: 1.6, color: 'rgba(240, 253, 244, 0.9)' }}>
            Follow each check-in from {sitter.name} during this {session.petType} boarding stay, all in one private link.
          </p>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div
              style={{
                minWidth: 180,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.14)',
                padding: '14px 16px',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(236, 253, 245, 0.72)' }}>
                Stay window
              </div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700 }}>
                {startDate} to {endDate}
              </div>
            </div>
            <div
              style={{
                minWidth: 140,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.14)',
                padding: '14px 16px',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(236, 253, 245, 0.72)' }}>
                Updates shared
              </div>
              <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800 }}>{updates.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div
          style={{
            borderRadius: 28,
            background: 'rgba(255,255,255,0.88)',
            padding: 24,
            boxShadow: '0 18px 46px rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {sitter.profileImage ? (
              <img
                src={sitter.profileImage}
                alt={sitter.name}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(22, 101, 52, 0.12)' }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #bbf7d0, #86efac)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#166534',
                  fontWeight: 800,
                }}
              >
                {sitter.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>
                Your sitter
              </div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: '#111827' }}>{sitter.name}</div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            <div style={{ borderRadius: 20, background: '#fff7ed', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9a3412' }}>
                Pet
              </div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: '#7c2d12' }}>
                {session.petName}
              </div>
            </div>
            <div style={{ borderRadius: 20, background: '#f0fdf4', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#166534' }}>
                Shared privately with
              </div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: '#14532d' }}>
                {session.ownerName}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 28,
            background: 'rgba(255,255,255,0.88)',
            padding: 24,
            boxShadow: '0 18px 46px rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>
            Feed notes
          </div>
          <ul style={{ margin: '16px 0 0', paddingLeft: 18, color: '#4b5563', lineHeight: 1.8 }}>
            <li>This page updates as new check-ins are posted.</li>
            <li>No account is needed for owners.</li>
            <li>Photo and video updates are shown in the order they were shared.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>
              Timeline
            </div>
            <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: '#111827' }}>Recent moments</h2>
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>{updates.length} shared update{updates.length === 1 ? '' : 's'}</div>
        </div>

        {updates.length === 0 ? (
          <div
            style={{
              borderRadius: 28,
              padding: '34px 24px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.88)',
              boxShadow: '0 18px 46px rgba(148, 163, 184, 0.14)',
              color: '#6b7280',
            }}
          >
            No updates yet. Your sitter will add photos and videos here soon.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {updates.map((update, index) => (
              <article
                key={`${update.mediaUrl}-${update.createdAt}-${index}`}
                style={{
                  overflow: 'hidden',
                  borderRadius: 28,
                  background: '#ffffff',
                  boxShadow: '0 18px 46px rgba(148, 163, 184, 0.16)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '18px 18px 14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#16a34a' }}>
                      Update {index + 1}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>
                      {update.type} shared
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {new Date(update.createdAt).toLocaleString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {update.type === 'photo' ? (
                  <img
                    src={update.mediaUrl}
                    alt={update.caption || session.petName}
                    style={{ width: '100%', display: 'block', maxHeight: 620, objectFit: 'cover', background: '#f3f4f6' }}
                  />
                ) : (
                  <video
                    src={update.mediaUrl}
                    controls
                    playsInline
                    style={{ width: '100%', display: 'block', maxHeight: 620, background: '#000' }}
                  />
                )}

                <div style={{ padding: '16px 18px 20px' }}>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#374151' }}>
                    {update.caption || 'A fresh moment from the stay.'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p style={{ textAlign: 'center', marginTop: 56, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>
        Powered by TailTimes
      </p>
    </main>
  );
}
