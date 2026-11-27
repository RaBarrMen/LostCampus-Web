'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Check, Clock, QrCode, ScanLine, Send, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { ItemImage } from '@/components/ItemCard';
import { EmptyState, EstadoBadge, PageLoader, Spinner } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const STEPS = [
  { key: 'pendiente', label: 'Enviado' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'entregado', label: 'Entregado' },
];

function Timeline({ estado }) {
  const idx = STEPS.findIndex((s) => s.key === estado);
  const failed = ['rechazado', 'cancelado'].includes(estado);
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = !failed && i <= idx;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-found text-white' : 'bg-surface-2 text-muted'}`}>
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-xs font-semibold ${done ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${!failed && i < idx ? 'bg-found' : 'bg-line'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function Chat({ claim, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const open = ['pendiente', 'aprobado'].includes(claim.estado);

  useEffect(() => {
    api(`/claims/${claim.id}/messages`).then(setMessages).catch(() => {});
    // Mensajes en tiempo real: Realtime solo entrega filas que RLS permite ver
    const channel = supabase
      .channel(`chat-${claim.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `claim_id=eq.${claim.id}` }, ({ new: m }) => {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [claim.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const contenido = text.trim();
    if (!contenido) return;
    setSending(true);
    try {
      const m = await api(`/claims/${claim.id}/messages`, { method: 'POST', body: { contenido } });
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setText('');
    } catch (err) {
      toast.error(err.message);
    }
    setSending(false);
  };

  return (
    <div className="card flex h-[480px] flex-col">
      <div className="border-b border-line px-4 py-3">
        <p className="font-display font-bold">Chat</p>
        <p className="text-xs text-muted">Acuerden dónde y cuándo hacer la entrega. No compartan datos sensibles.</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Aún no hay mensajes.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[80%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-ink text-bg' : 'rounded-bl-md bg-surface-2'}`}>
                {m.contenido}
                <span className={`mt-0.5 block text-[10px] ${mine ? 'text-bg/60' : 'text-muted'}`}>
                  {new Date(m.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {open ? (
        <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
          <input className="input" placeholder="Escribe un mensaje…" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary px-3" disabled={sending || !text.trim()} aria-label="Enviar">
            <Send size={18} />
          </button>
        </form>
      ) : (
        <p className="border-t border-line p-3 text-center text-xs text-muted">El chat está cerrado.</p>
      )}
    </div>
  );
}

export default function ReclamoPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState(null);
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api(`/claims/${id}`)
      .then(setClaim)
      .catch(setError);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <EmptyState title="No se pudo abrir el reclamo" action={<Link href="/reclamos" className="btn-ghost">Volver</Link>}>{error.message}</EmptyState>;
  if (!claim) return <PageLoader />;

  const isClaimant = claim.claimant_id === user.id;
  const isFinder = claim.item?.user_id === user.id;

  const act = async (accion) => {
    if (accion === 'cancelar' && !confirm('¿Cancelar el reclamo?')) return;
    setBusy(true);
    try {
      await api(`/claims/${id}`, { method: 'PATCH', body: { accion } });
      toast.success({ aprobar: 'Reclamo aprobado', rechazar: 'Reclamo rechazado', cancelar: 'Reclamo cancelado' }[accion]);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const genQr = async () => {
    setBusy(true);
    try {
      setQr(await api(`/claims/${id}/qr`));
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/reclamos" className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Reclamos
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex gap-4">
              <Link href={`/objeto/${claim.item_id}`} className="size-20 shrink-0 overflow-hidden rounded-xl">
                <ItemImage item={{ ...claim.item, tipo: 'encontrado' }} />
              </Link>
              <div className="min-w-0">
                <EstadoBadge estado={claim.estado} reclamo />
                <h1 className="mt-1 truncate text-2xl font-extrabold">{claim.item?.titulo}</h1>
                <p className="text-sm text-muted">
                  {isClaimant ? `Lo encontró ${claim.item?.owner?.nombre || 'un usuario'}` : `Lo reclama ${claim.claimant?.nombre || 'un usuario'}`} · {claim.item?.zona}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <Timeline estado={claim.estado} />
            </div>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <ShieldCheck size={16} /> Verificación
            </p>
            <p className="mt-3 text-sm text-muted">Pregunta</p>
            <p className="font-semibold">{claim.item?.pregunta_verificacion}</p>
            <p className="mt-3 text-sm text-muted">Respuesta del reclamante</p>
            <p className="rounded-xl bg-surface-2 p-3 font-semibold">{claim.respuesta}</p>

            {isFinder && claim.estado === 'pendiente' && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="btn-ghost text-lost" onClick={() => act('rechazar')} disabled={busy}>
                  <X size={16} /> No coincide
                </button>
                <button className="btn-primary" onClick={() => act('aprobar')} disabled={busy}>
                  <Check size={16} /> Aprobar
                </button>
              </div>
            )}
            {isClaimant && claim.estado === 'pendiente' && (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm">
                <Clock size={16} /> Esperando a que quien lo encontró revise tu respuesta.
              </p>
            )}
          </div>

          {claim.estado === 'aprobado' && (
            <div className="card p-5 text-center">
              {isClaimant ? (
                qr ? (
                  <div className="animate-rise">
                    <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                      <QRCodeSVG value={qr.token} size={220} level="M" />
                    </div>
                    <p className="mt-4 font-semibold">Muestra este código al recoger tu objeto</p>
                    <p className="text-sm text-muted">Válido por {qr.expira_en_horas} h y solo se puede usar una vez. Si generas otro, este deja de funcionar.</p>
                  </div>
                ) : (
                  <>
                    <QrCode className="mx-auto text-accent" size={36} />
                    <p className="mt-3 font-semibold">Tu reclamo fue aprobado</p>
                    <p className="text-sm text-muted">Genera tu código QR cuando estés por recoger el objeto.</p>
                    <button className="btn-primary mt-4" onClick={genQr} disabled={busy}>
                      {busy ? <Spinner /> : 'Generar código QR'}
                    </button>
                  </>
                )
              ) : (
                <>
                  <ScanLine className="mx-auto text-accent" size={36} />
                  <p className="mt-3 font-semibold">Reclamo aprobado</p>
                  <p className="text-sm text-muted">Al entregar el objeto, escanea el código QR del dueño{claim.item?.en_resguardo ? ' (o pídele al resguardo que lo escanee)' : ''}.</p>
                  <Link href="/escanear" className="btn-primary mt-4">
                    Escanear QR
                  </Link>
                </>
              )}
              {isClaimant && (
                <button className="mt-4 text-xs font-semibold text-muted hover:text-lost" onClick={() => act('cancelar')} disabled={busy}>
                  Cancelar reclamo
                </button>
              )}
            </div>
          )}

          {claim.estado === 'entregado' && (
            <div className="card bg-found p-6 text-center text-white">
              <Check className="mx-auto" size={36} />
              <p className="mt-2 font-display text-xl font-bold">¡Objeto entregado!</p>
              <p className="text-sm text-white/80">El caso quedó cerrado. Gracias por usar LostCampus.</p>
            </div>
          )}
        </div>

        <Chat claim={claim} userId={user.id} />
      </div>
    </div>
  );
}
