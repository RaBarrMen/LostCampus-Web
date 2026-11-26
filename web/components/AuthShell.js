import Link from 'next/link';
import { Logo } from './ui';
import { ThemeToggle } from './ThemeToggle';

// Diseño compartido de las pantallas de login y registro
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#111a36] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="dot-grid absolute inset-0" />
        <div className="absolute -right-24 top-1/3 size-96 rounded-full bg-accent/25 blur-3xl" />
        <Link href="/" className="relative">
          <Logo light />
        </Link>
        <blockquote className="relative max-w-md">
          <p className="font-display text-3xl font-bold leading-tight">“Perdí mi credencial en la biblioteca y en dos horas ya tenía un aviso de coincidencia.”</p>
          <footer className="mt-4 text-sm text-white/60">— Ejemplo de uso de LostCampus</footer>
        </blockquote>
        <p className="relative text-sm text-white/50">Solo para la comunidad del Tecnológico de Celaya.</p>
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-1.5 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
