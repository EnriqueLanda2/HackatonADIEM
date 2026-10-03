import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'agromIA',
  description:
    'Sistema de automatización de riego agrícola con telemetría en tiempo real y visualización 3D. Cultivos: caña de azúcar, nopal, aguacate, tomate, maíz, sorgo, arroz.',
  manifest: '/manifest.json',
  applicationName: 'agromIA',
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'agromIA',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
  },
};

// viewport-fit=cover: la app ocupa toda la pantalla y respeta notch y barra inferior con safe-area.
// Se permite el zoom (accesibilidad); los campos usan 16 px en móvil para que iOS no haga zoom al enfocarlos.
export const viewport: Viewport = {
  themeColor: '#365004',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} antialiased bg-ink text-creme`}>{children}</body>
    </html>
  );
}
