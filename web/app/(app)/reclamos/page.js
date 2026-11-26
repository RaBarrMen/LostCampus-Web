'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ItemImage } from '@/components/ItemCard';
import { EmptyState, EstadoBadge, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

function ClaimRow({ c }) {
  const otro = c.rol_en_reclamo === 'reclamante' ? c.item?.owner?.nombre : c.claimant?.nombre;
  return (
    <Link href={`/reclamos/${c.id}`} className="card flex items-center gap-4 p-3 transition hover:-translate-y-0.5">
      <div className="size-16 shrink-0 overflow-hidden rounded-xl">
        <ItemImage item={{ ...c.item, tipo: 'encontrado' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold">{c.item?.titulo}</p>
        <p className="truncate text-sm text-muted">
          {c.rol_en_reclamo === 'reclamante' ? `Encontrado por ${otro || 'un usuario'}` : `Reclamado por ${otro || 'un usuario'}`} · {timeAgo(c.updated_at)}
        </p>
      </div>
      <EstadoBadge estado={c.estado} reclamo />
      <ChevronRight className="text-muted" size={18} />
    </Link>
  );
}

export default function ReclamosPage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('recibidos');

  useEffect(() => {
    api('/claims')
      .then((d) => {
        setData(d);
        if (!d.recibidos.length && d.hechos.length) setTab('hechos');
      })
      .catch((e) => toast.error(e.message));
  }, []);

  if (!data) return <PageLoader />;
  const list = data[tab];
  const pendientes = data.recibidos.filter((c) => c.estado === 'pendiente').length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold md:text-4xl">Reclamos</h1>
      <div className="mb-5 mt-4 flex rounded-xl bg-surface-2 p-1">
        {[
          ['recibidos', 'De objetos que encontré', pendientes],
          ['hechos', 'Objetos que reclamé', 0],
        ].map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${tab === k ? 'bg-surface shadow-sm' : 'text-muted'}`}>
            {label}
            {n > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-ink">{n}</span>}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={MessageCircle} title="Nada por aquí">
          {tab === 'recibidos' ? 'Cuando alguien reclame un objeto que encontraste aparecerá aquí.' : 'Cuando reclames un objeto podrás seguir el proceso aquí.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <ClaimRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
