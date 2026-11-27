'use client';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, CircleCheck, Lock, MapPin, RefreshCw, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ItemCard, ItemImage } from '@/components/ItemCard';
import { SinglePinMap } from '@/components/MapLoader';
import { CategoryIcon, ColorDot, EmptyState, EstadoBadge, PageLoader, Spinner, TipoBadge } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/format';

function ClaimModal({ item, onClose }) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const claim = await api('/claims', { method: 'POST', body: { item_id: item.id, respuesta } });
      toast.success('Reclamo enviado. Te avisaremos cuando respondan.');
      router.push(`/reclamos/${claim.id}`);
    } catch (err) {
      toast.error(err.message);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md rounded-b-none p-6 animate-rise sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent">
            <ShieldCheck size={22} />
          </div>
          <button type="button" onClick={onClose} className="text-muted" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-bold">Demuestra que es tuyo</h2>
        <p className="mt-1 text-sm text-muted">Quien encontró el objeto revisará tu respuesta. Solo tienes 2 intentos.</p>
        <p className="mt-5 rounded-xl bg-surface-2 p-3 text-sm font-semibold">{item.pregunta_verificacion}</p>
        <textarea className="input mt-3 resize-none" rows={3} maxLength={300} required minLength={2} placeholder="Tu respuesta…" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
        <button className="btn-primary mt-4 w-full py-3" disabled={sending || respuesta.trim().length < 2}>
          {sending ? <Spinner /> : 'Enviar reclamo'}
        </button>
      </form>
    </div>
  );
}

function ObjetoView() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadMatches = useCallback(() => api(`/matches?item_id=${id}`).then(setMatches).catch(() => setMatches([])), [id]);

  useEffect(() => {
    api(`/items/${id}`)
      .then((it) => {
        setItem(it);
        if (it.es_mio) {
          // El matching corre en segundo plano: si el reporte es nuevo, esperamos un momento
          setTimeout(loadMatches, params.get('nuevo') ? 1500 : 0);
        }
      })
      .catch((e) => setError(e));
  }, [id, loadMatches, params]);

  if (error) return <EmptyState title={error.status === 404 ? 'Este reporte no existe' : 'No se pudo cargar el reporte'} action={<Link href="/inicio" className="btn-ghost">Volver al inicio</Link>} />;
  if (!item) return <PageLoader />;

  const isAdmin = profile?.rol === 'admin';
  const canClaim = !item.es_mio && item.tipo === 'encontrado' && item.estado === 'activo';

  const rerun = async () => {
    setBusy(true);
    try {
      const r = await api('/matches/run', { method: 'POST', body: { item_id: id } });
      await loadMatches();
      toast.success(r.nuevas ? `Encontramos ${r.nuevas} coincidencia(s) nueva(s)` : 'No hay coincidencias nuevas por ahora');
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const discard = async (m) => {
    setMatches((list) => list.filter((x) => x.id !== m.id));
    api(`/matches/${m.id}`, { method: 'PATCH', body: { estado: 'descartado' } }).catch(() => {});
  };

  const close = async () => {
    try {
      setItem({ ...item, ...(await api(`/items/${id}`, { method: 'PATCH', body: { estado: item.estado === 'cerrado' ? 'activo' : 'cerrado' } })) });
      toast.success('Reporte actualizado');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async () => {
    if (!confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')) return;
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      toast.success('Reporte eliminado');
      router.replace('/mis-reportes');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card overflow-hidden self-start">
          <div className="aspect-[4/3] w-full">
            <ItemImage item={item} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <TipoBadge tipo={item.tipo} />
              <EstadoBadge estado={item.estado} />
              {item.en_resguardo && (
                <span className="chip bg-found-soft text-found">
                  <ShieldCheck size={12} /> En resguardo
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold">{item.titulo}</h1>
            {item.descripcion && <p className="mt-2 whitespace-pre-line text-muted">{item.descripcion}</p>}

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Categoría</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                  <CategoryIcon name={item.categories?.icono} size={16} /> {item.categories?.nombre}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Color</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-semibold capitalize">
                  <ColorDot color={item.color} /> {item.color}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Zona</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                  <MapPin size={15} /> {item.zona}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">{item.tipo === 'perdido' ? 'Se perdió' : 'Se encontró'}</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                  <Calendar size={15} /> {formatDate(item.fecha)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              Publicado por {item.es_mio ? 'ti' : item.profiles?.nombre || 'un usuario'} · {timeAgo(item.created_at)}
            </p>

            {canClaim && (
              <button onClick={() => setClaimOpen(true)} className="btn-primary mt-6 w-full py-3 text-base">
                <CircleCheck size={20} /> ¡Es mío!
              </button>
            )}
            {!item.es_mio && item.tipo === 'perdido' && item.estado === 'activo' && (
              <Link href="/reportar?tipo=encontrado" className="btn-dark mt-6 w-full py-3">
                ¿Lo encontraste? Repórtalo como encontrado
              </Link>
            )}
            {item.estado === 'en_proceso' && !item.es_mio && (
              <p className="mt-6 flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm text-muted">
                <Lock size={16} /> Este objeto ya está en proceso de entrega.
              </p>
            )}

            {(item.es_mio || isAdmin) && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
                {item.es_mio && ['activo', 'cerrado'].includes(item.estado) && (
                  <button onClick={close} className="btn-ghost">
                    {item.estado === 'cerrado' ? 'Reactivar' : 'Cerrar reporte'}
                  </button>
                )}
                <button onClick={remove} className="btn-ghost text-lost">
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            )}
          </div>

          {typeof item.lat === 'number' && (
            <div className="card overflow-hidden p-1.5">
              <SinglePinMap item={item} />
            </div>
          )}
        </div>
      </div>

      {/* Coincidencias (solo el autor) */}
      {item.es_mio && item.estado === 'activo' && (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                <Sparkles className="text-accent" /> Posibles coincidencias
              </h2>
              <p className="text-sm text-muted">Comparamos categoría, color, zona, fecha y palabras clave.</p>
            </div>
            <button onClick={rerun} disabled={busy} className="btn-ghost">
              <RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Buscar de nuevo
            </button>
          </div>
          {matches === null ? (
            <PageLoader />
          ) : matches.length === 0 ? (
            <EmptyState icon={Sparkles} title="Aún no hay coincidencias">
              Te enviaremos una notificación en cuanto alguien reporte algo parecido.
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {matches.map((m, i) => (
                <div key={m.id} className="flex flex-col">
                  <ItemCard item={m.item} score={m.score} index={i} />
                  <button onClick={() => discard(m)} className="mt-2 self-center rounded-lg px-3 py-1 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-lost">
                    No es mi objeto
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {claimOpen && <ClaimModal item={item} onClose={() => setClaimOpen(false)} />}
    </div>
  );
}

export default function ObjetoPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ObjetoView />
    </Suspense>
  );
}
