import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TailTimes',
  description: 'Pet boarding session updates',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          background:
            'radial-gradient(circle at top, rgba(255, 240, 205, 0.95), rgba(255, 247, 237, 0.9) 28%, #fffdf8 62%)',
          color: '#1f2937',
        }}
      >
        {children}
      </body>
    </html>
  );
}
