// Fuentes alojadas en el propio sitio (sin peticiones a Google Fonts)
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/AuthProvider';
import { themeScript } from '@/components/ThemeToggle';
import './globals.css';

export const metadata = {
  title: { default: 'LostCampus · Objetos perdidos del Tec de Celaya', template: '%s · LostCampus' },
  description: 'Reporta, encuentra y recupera objetos perdidos dentro del Tecnológico de Celaya.',
};

export const viewport = {
  themeColor: '#1d2b53',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
