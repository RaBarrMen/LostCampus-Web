'use client';
import {
  Backpack,
  BookOpen,
  Calculator,
  CupSoda,
  Glasses,
  Headphones,
  IdCard,
  KeyRound,
  LoaderCircle,
  Package,
  Shirt,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { COLORES, ESTADOS, ESTADOS_RECLAMO } from '@/lib/campus';

const ICONS = {
  smartphone: Smartphone,
  wallet: Wallet,
  'key-round': KeyRound,
  'id-card': IdCard,
  backpack: Backpack,
  'book-open': BookOpen,
  shirt: Shirt,
  glasses: Glasses,
  'cup-soda': CupSoda,
  headphones: Headphones,
  calculator: Calculator,
  package: Package,
};

export function CategoryIcon({ name, size = 20, className = '' }) {
  const Icon = ICONS[name] || Package;
  return <Icon size={size} className={className} />;
}

export function TipoBadge({ tipo, className = '' }) {
  const lost = tipo === 'perdido';
  return (
    <span className={`chip ${lost ? 'bg-lost-soft text-lost' : 'bg-found-soft text-found'} ${className}`}>
      <span className={`size-1.5 rounded-full ${lost ? 'bg-lost' : 'bg-found'}`} />
      {lost ? 'Perdido' : 'Encontrado'}
    </span>
  );
}

export function EstadoBadge({ estado, reclamo = false }) {
  const map = reclamo ? ESTADOS_RECLAMO : ESTADOS;
  const e = map[estado] || { label: estado, cls: 'bg-surface-2 text-muted' };
  return <span className={`chip ${e.cls}`}>{e.label}</span>;
}

export function ColorDot({ color, size = 14 }) {
  const bg = COLORES[color] || '#ccc';
  return <span title={color} className="inline-block shrink-0 rounded-full border border-black/10" style={{ width: size, height: size, background: bg }} />;
}

export function Spinner({ className = '' }) {
  return <LoaderCircle className={`animate-spin ${className}`} size={20} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted">
      <Spinner />
    </div>
  );
}

export function EmptyState({ icon: Icon = Package, title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon size={26} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-surface-2" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

export function Logo({ light = false }) {
  return (
    <span className={`flex items-center gap-2 font-display text-lg font-extrabold ${light ? 'text-white' : 'text-ink'}`}>
      <span className="relative grid size-8 place-items-center rounded-xl bg-accent text-accent-ink">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
          <path d="M11 8.5v2.8l1.8 1.2" />
        </svg>
      </span>
      <span>
        Lost<span className="text-accent">Campus</span>
      </span>
    </span>
  );
}
