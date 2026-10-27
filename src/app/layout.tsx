import React from 'react';
import '../index.css';

export const metadata = {
  title: 'Gepa — Personal Corner',
  description: 'Personal website and corner for Gepa featuring links, profile info, and supporter donations.',
  metadataBase: new URL('https://www.gepacorner.my.id'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Gepa — Personal Corner',
    description: 'Personal website and corner for Gepa featuring links, profile info, and supporter donations.',
    url: 'https://www.gepacorner.my.id',
    siteName: 'Gepa — Personal Corner',
    images: [
      {
        url: '/favicon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Gepa Corner Logo'
      }
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'Gepa — Personal Corner',
    description: 'Personal website and corner for Gepa featuring links, profile info, and supporter donations.',
    images: ['/favicon-512x512.png']
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.ico' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' }
    ]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#5E7C57'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Kalam:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="Mid-client-l9Y2DBOBf5qo02s7" async></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
