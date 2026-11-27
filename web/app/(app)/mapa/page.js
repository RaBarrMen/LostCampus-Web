'use client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ItemsMap } from '@/components/MapLoader';
import { api } from '@/lib/api';

export default function MapaPage() {
  const [items, setItems] = useState([]);
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    api('/items?limit=100')
      .then((r) => setItems(r.data))
      .catch((e) => toast.error(e.message));
  }, []);

  const visible = useMemo(() => items.filter((i) => !tipo || i.tipo === tipo), [items, tipo]);
  const count = (t) => items.filter((i) => i.tipo === t && typeof i.lat === 'number').length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold md:text-4xl">Mapa del campus</h1>
          <p className="text-muted">Toca un pin para ver el objeto.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTipo(tipo === 'perdido' ? '' : 'perdido')} className={`chip border px-3 py-2 text-sm ${tipo === 'perdido' ? 'border-lost bg-lost text-white' : 'border-line bg-surface text-lost'}`}>
            <span className="size-2 rounded-full bg-current" /> Perdidos · {count('perdido')}
          </button>
          <button onClick={() => setTipo(tipo === 'encontrado' ? '' : 'encontrado')} className={`chip border px-3 py-2 text-sm ${tipo === 'encontrado' ? 'border-found bg-found text-white' : 'border-line bg-surface text-found'}`}>
            <span className="size-2 rounded-full bg-current" /> Encontrados · {count('encontrado')}
          </button>
        </div>
      </div>
      <div className="card overflow-hidden p-1.5">
        <ItemsMap items={visible} height="min(70vh, 640px)" />
      </div>
    </div>
  );
}
