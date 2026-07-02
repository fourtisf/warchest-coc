import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://warchest.fun'),
  title: 'WARCHEST — Build. Raid. Earn.',
  description:
    'Build your warcamp, raid real players, earn $WAR on Solana. Free in your browser — no download.',
  openGraph: {
    title: 'WARCHEST — Build. Raid. Earn.',
    description: 'Build your warcamp, raid real players, earn $WAR on Solana.',
    url: 'https://warchest.fun',
    siteName: 'WARCHEST',
    images: [{ url: '/og.png', width: 1600, height: 900 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Warchestfun',
    creator: '@Warchestfun',
    title: 'WARCHEST — Build. Raid. Earn.',
    description: 'Build your warcamp, raid real players, earn $WAR on Solana.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0e14',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
