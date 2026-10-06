import { ImageResponse } from 'next/og';

// The icon iOS uses when the site is added to the home screen (180x180), the same bin as icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0a0b0d' }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <rect x="13.5" y="2.5" width="5" height="5" rx="1.2" fill="#ff7a4d" />
          <rect x="4.5" y="9.5" width="23" height="3.2" rx="1.6" fill="#c2f24b" />
          <path d="M7 14h18l-1.55 11.8a2.2 2.2 0 0 1-2.18 1.9H10.73a2.2 2.2 0 0 1-2.18-1.9L7 14Z" fill="#c2f24b" />
        </svg>
      </div>
    ),
    size
  );
}
