import { ImageResponse } from 'next/og';

// The icon iOS uses when the site is added to the home screen (180x180), the same bin as icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#151514' }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="clay" x1="16" y1="9.5" x2="16" y2="27.7" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f4bfa5" />
              <stop offset="1" stopColor="#d98863" />
            </linearGradient>
          </defs>
          <rect x="13.5" y="2.5" width="5" height="5" rx="1.2" fill="#ffc857" />
          <rect x="4.5" y="9.5" width="23" height="3.2" rx="1.6" fill="url(#clay)" />
          <path d="M7 14h18l-1.55 11.8a2.2 2.2 0 0 1-2.18 1.9H10.73a2.2 2.2 0 0 1-2.18-1.9L7 14Z" fill="url(#clay)" />
          <rect x="10.8" y="16.6" width="3.4" height="3.4" rx="0.8" fill="#151514" />
          <rect x="17.8" y="16.6" width="3.4" height="3.4" rx="0.8" fill="#151514" />
          <rect x="14.3" y="21.4" width="3.4" height="3.4" rx="0.8" fill="#151514" />
        </svg>
      </div>
    ),
    size
  );
}
