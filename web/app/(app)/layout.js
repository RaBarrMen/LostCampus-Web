'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, House, LayoutDashboard, LogOut, Map, MessageCircle, Plus, ScanLine, UserRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo, PageLoader } from '@/components/ui';

const NAV = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mapa', label: 'Mapa', icon: Map },
  { href: '/reclamos', label: 'Reclamos', icon: MessageCircle },
  { href: '/mis-reportes', label: 'Mis reportes', icon: ClipboardList },
];

export default function AppLayout({ children }) {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Protección de rutas: sin sesión se manda al login
  useEffect(() => {
    if (!loading && !session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, session, router, pathname]);

  if (loading || !session) return <PageLoader />;

  const staff = profile && ['admin', 'resguardo'].includes(profile.rol);
  const nav = [...NAV, ...(staff ? [{ href: '/escanear', label: 'Escanear', icon: ScanLine }, { href: '/admin', label: 'Panel', icon: LayoutDashboard }] : [])];
  const active = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-[900] border-b border-line bg-bg/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/inicio">
            <Logo />
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active(n.href) ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/reportar" className="btn-primary hidden sm:inline-flex">
              <Plus size={18} /> Reportar
            </Link>
            <NotificationBell userId={session.user.id} />
            <ThemeToggle className="hidden sm:grid" />
            <Link href="/perfil" aria-label="Perfil" className="grid size-10 place-items-center rounded-xl bg-ink font-display text-sm font-bold text-bg">
              {(profile?.nombre || session.user.email || '?').charAt(0).toUpperCase()}
            </Link>
            <button onClick={signOut} aria-label="Cerrar sesión" className="hidden size-10 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink md:grid">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>

      {/* Navegación inferior en celular */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
          {[nav[0], nav[1], { href: '/reportar', label: 'Reportar', icon: Plus, main: true }, nav[2], staff ? { href: '/escanear', label: 'Escanear', icon: ScanLine } : { href: '/perfil', label: 'Perfil', icon: UserRound }].map((n) =>
            n.main ? (
              <Link key={n.href} href={n.href} className="-mt-6 flex flex-col items-center gap-1 text-[11px] font-semibold">
                <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-accent/30">
                  <n.icon size={26} />
                </span>
                {n.label}
              </Link>
            ) : (
              <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-1 text-[11px] font-semibold ${active(n.href) ? 'text-ink' : 'text-muted'}`}>
                <n.icon size={22} />
                {n.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
