'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Search, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState, SkeletonCard } from '@/components/ui';
import { useCategories } from '@/components/useCategories';
import { useAuth } from '@/components/AuthProvider';
import { api, qs } from '@/lib/api';
import { ZONAS } from '@/lib/campus';

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'perdido', label: 'Perdidos' },
  { value: 'encontrado', label: 'Encontrados' },
];

export default function InicioPage() {
  const { profile } = useAuth();
  const cats = useCategories();
  const [filters, setFilters] = useState({ tipo: '', category_id: '', zona: '', q: '' });
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Espera 350 ms después de escribir antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: search.trim() })), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api(`/items${qs({ ...filters, page, limit: 24 })}`)
      .then((r) => !cancel && setData((prev) => (page === 1 ? r : { ...r, data: [...prev.data, ...r.data] })))
      .catch((e) => toast.error(e.message))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [filters, page]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Hola{profile?.nombre ? `, ${profile.nombre.split(' ')[0]}` : ''} 👋</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">Objetos en el campus</h1>
        </div>
        <Link href="/reportar" className="btn-primary sm:hidden">
          <Plus size={18} /> Reportar
        </Link>
      </div>

      <div className="card mb-6 space-y-3 p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input className="input border-0 bg-surface-2 pl-10" placeholder="Buscar por nombre o descripción…" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={60} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-surface-2 p-1">
            {TABS.map((t) => (
              <button key={t.value} onClick={() => setFilters({ ...filters, tipo: t.value })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${filters.tipo === t.value ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <select className="input w-auto py-2" value={filters.category_id} onChange={set('category_id')} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <select className="input w-auto py-2" value={filters.zona} onChange={set('zona')} aria-label="Zona">
            <option value="">Todo el campus</option>
            {ZONAS.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
          <span className="ml-auto text-sm text-muted">{data.total} resultados</span>
        </div>
      </div>

      {loading && page === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState icon={SearchX} title="No hay reportes con esos filtros" action={<Link href="/reportar" className="btn-primary">Reportar un objeto</Link>}>
          Prueba con otra categoría o zona, o sé el primero en reportar.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((item, i) => (
              <ItemCard key={item.id} item={item} index={i} />
            ))}
          </div>
          {data.data.length < data.total && (
            <div className="mt-8 text-center">
              <button className="btn-ghost" onClick={() => setPage(page + 1)} disabled={loading}>
                {loading ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
