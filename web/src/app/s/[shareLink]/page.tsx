/**
 * Owner session feed — publicly accessible via share link.
 * No login required. Fetches data server-side for fast first load.
 *
 * URL: https://tailtimes.app/s/<shareLink>
 * Backend: GET /api/share/:shareLink
 */

import { notFound } from 'next/navigation';

interface Update {
  id: string;
  type: 'photo' | 'video';
  mediaUrl: string;
  caption?: string;
  createdAt: string;
}

interface SessionFeed {
  session: {
    petName: string;
    petType: string;
    ownerName: string;
    startDate: string;
    endDate?: string;
  };
  sitter: {
    name: string;
    profileImage?: string;
  };
  updates: Update[];
}

async function getSessionFeed(shareLink: string): Promise<SessionFeed | null> {
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

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 64px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 4px' }}>
          {session.petType} boarding · {startDate}
        </p>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>
          {session.petName}&apos;s updates
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {sitter.profileImage && (
            <img
              src={sitter.profileImage}
              alt={sitter.name}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <span style={{ fontSize: 14, color: '#555' }}>Cared for by {sitter.name}</span>
        </div>
      </div>

      {/* Updates feed */}
      {updates.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', marginTop: 48 }}>
          No updates yet — check back soon!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {updates.map((update) => (
            <div
              key={update.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              {update.type === 'photo' ? (
                <img
                  src={update.mediaUrl}
                  alt={update.caption || session.petName}
                  style={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'cover' }}
                />
              ) : (
                <video
                  src={update.mediaUrl}
                  controls
                  playsInline
                  style={{ width: '100%', display: 'block', maxHeight: 480, background: '#000' }}
                />
              )}
              {update.caption && (
                <p style={{ margin: 0, padding: '10px 14px', fontSize: 14, color: '#333' }}>
                  {update.caption}
                </p>
              )}
              <p
                style={{
                  margin: 0,
                  padding: update.caption ? '0 14px 10px' : '10px 14px',
                  fontSize: 12,
                  color: '#aaa',
                }}
              >
                {new Date(update.createdAt).toLocaleTimeString('en-AU', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <p style={{ textAlign: 'center', marginTop: 48, fontSize: 12, color: '#ccc' }}>
        Powered by TailTimes
      </p>
    </main>
  );
}
