'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState, SkeletonCard } from '@/components/ui';
import { api } from '@/lib/api';

export default function MisReportesPage() {
  const [items, setItems] = useState(null);
  const [filtro, setFiltro] = useState('activos');

  useEffect(() => {
    api('/items/mine')
      .then(setItems)
      .catch((e) => toast.error(e.message));
  }, []);

  const visibles = (items || []).filter((i) => (filtro === 'activos' ? ['activo', 'en_proceso'].includes(i.estado) : !['activo', 'en_proceso'].includes(i.estado)));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold md:text-4xl">Mis reportes</h1>
        <div className="flex rounded-xl bg-surface-2 p-1">
          {['activos', 'historial'].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${filtro === f ? 'bg-surface shadow-sm' : 'text-muted'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <EmptyState icon={ClipboardList} title={filtro === 'activos' ? 'No tienes reportes activos' : 'Tu historial está vacío'} action={<Link href="/reportar" className="btn-primary"><Plus size={18} /> Nuevo reporte</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibles.map((it, i) => (
            <ItemCard key={it.id} item={it} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
