/**
 * Owner session feed — publicly accessible via share link.
 * No login required. Fetches data server-side for fast first load.
 *
 * URL: https://tailtimes.app/s/<shareLink>
 * Backend: GET /api/share/:shareLink
 */

import { notFound } from 'next/navigation';
import type { PublicSessionFeed, SessionUpdateTag } from '@tailtimes/shared';

const tagStyles: Record<SessionUpdateTag, { background: string; border: string; color: string }> = {
  walks: { background: '#e0f2fe', border: '#bae6fd', color: '#0c4a6e' },
  food: { background: '#fef3c7', border: '#fde68a', color: '#92400e' },
  lounging: { background: '#dcfce7', border: '#bbf7d0', color: '#166534' },
  sleeping: { background: '#e0e7ff', border: '#c7d2fe', color: '#3730a3' },
  misc: { background: '#f3f4f6', border: '#e5e7eb', color: '#374151' },
};

function formatUpdateTimestamp(value: string) {
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function getSessionFeed(shareLink: string): Promise<PublicSessionFeed | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/share/${shareLink}`, {
    cache: 'no-store',
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

  const { session, sitter } = feed;
  const updates = [...feed.updates].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 72px' }}>
      <section
        style={{
          borderRadius: 24,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          padding: 18,
          boxShadow: '0 12px 30px rgba(148, 163, 184, 0.12)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280' }}>
          TailTimes owner feed
        </div>
        <h1 style={{ margin: '8px 0 0', fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: '#111827' }}>
          {session.petName}&apos;s updates
        </h1>
        <div style={{ marginTop: 12, fontSize: 15, color: '#374151' }}>
          Shared by <strong>{sitter.name}</strong> for <strong>{session.ownerName}</strong>
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: '#6b7280' }}>
          {startDate} to {endDate}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>
              Timeline
            </div>
            <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: '#111827' }}>Recent moments</h2>
          </div>
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

                <div style={{ padding: '14px 18px 18px', display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {formatUpdateTimestamp(update.createdAt)}
                  </div>

                  {update.tags?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {update.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            borderRadius: 999,
                            background: tagStyles[tag].background,
                            border: `1px solid ${tagStyles[tag].border}`,
                            color: tagStyles[tag].color,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '4px 9px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {update.caption ? (
                    <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#374151' }}>
                      {update.caption}
                    </p>
                  ) : null}
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
