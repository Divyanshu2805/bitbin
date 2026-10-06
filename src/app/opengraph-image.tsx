import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

// The preview image for links shared on social networks and chat apps (1200x630).
// Drawn with the site's graphite and lime, and generated once at build time.
export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPES = ['snippets', 'prompts', 'commands', 'notes', 'files', 'images', 'links'];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 96px',
          background: 'linear-gradient(135deg, #08090a 0%, #12150f 100%)',
          color: '#f3f5ee',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="112" height="112" viewBox="0 0 32 32">
            <rect x="13.5" y="2.5" width="5" height="5" rx="1.2" fill="#ff7a4d" />
            <rect x="4.5" y="9.5" width="23" height="3.2" rx="1.6" fill="#c2f24b" />
            <path d="M7 14h18l-1.55 11.8a2.2 2.2 0 0 1-2.18 1.9H10.73a2.2 2.2 0 0 1-2.18-1.9L7 14Z" fill="#c2f24b" />
          </svg>
          <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, marginLeft: 32, letterSpacing: -3 }}>
            Bit<span style={{ color: '#c2f24b' }}>Bin</span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, marginTop: 48, lineHeight: 1.1, letterSpacing: -1.5 }}>
          {SITE_TAGLINE}.
        </div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 24, color: '#a3a8b1' }}>
          Snippets, prompts, commands, notes, files and links.
        </div>
        <div style={{ display: 'flex', marginTop: 48 }}>
          {TYPES.map((type) => (
            <div
              key={type}
              style={{
                display: 'flex',
                marginRight: 14,
                padding: '8px 18px',
                borderRadius: 10,
                border: '2px solid #2a2f26',
                color: '#c2f24b',
                fontSize: 24,
              }}
            >
              {type}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
