'use client';
import Link from 'next/link';
import { MapPin, ShieldCheck } from 'lucide-react';
import { CategoryIcon, ColorDot, EstadoBadge, TipoBadge } from './ui';
import { timeAgo } from '@/lib/format';

export function ItemImage({ item, className = '' }) {
  if (item.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.image_url} alt={item.titulo} loading="lazy" className={`size-full object-cover ${className}`} />;
  }
  const lost = item.tipo === 'perdido';
  return (
    <div className={`grid size-full place-items-center ${lost ? 'bg-lost-soft text-lost' : 'bg-found-soft text-found'} ${className}`}>
      <CategoryIcon name={item.categories?.icono} size={44} className="opacity-80" />
    </div>
  );
}

export function ItemCard({ item, score, index = 0 }) {
  return (
    <Link
      href={`/objeto/${item.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ItemImage item={item} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <TipoBadge tipo={item.tipo} className="shadow-sm" />
          {item.estado && item.estado !== 'activo' && <EstadoBadge estado={item.estado} />}
        </div>
        {score !== undefined && (
          <span className="chip absolute right-3 top-3 bg-ink text-bg shadow">{score}% coincide</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-base font-bold">{item.titulo}</h3>
          <ColorDot color={item.color} />
        </div>
        <p className="flex items-center gap-1 text-sm text-muted">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{item.zona}</span>
        </p>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted">
          <span>{item.categories?.nombre}</span>
          <span>{timeAgo(item.created_at)}</span>
        </div>
        {item.en_resguardo && (
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-found">
            <ShieldCheck size={13} /> En resguardo
          </span>
        )}
      </div>
    </Link>
  );
}
