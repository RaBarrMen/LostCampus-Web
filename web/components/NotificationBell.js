'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/format';

const isInternal = (l) => typeof l === 'string' && l.startsWith('/') && !l.startsWith('//');

export function NotificationBell({ userId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!userId) return;
    api('/notifications')
      .then((r) => {
        setItems(r.data);
        setUnread(r.sin_leer);
      })
      .catch(() => {});

    // Notificaciones en tiempo real (Supabase Realtime + RLS)
    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, ({ new: n }) => {
        setItems((prev) => [n, ...prev].slice(0, 30));
        setUnread((u) => u + 1);
        toast(n.titulo, {
          description: n.cuerpo,
          action: isInternal(n.link) ? { label: 'Ver', onClick: () => router.push(n.link) } : undefined,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.leida) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
    }
    if (isInternal(n.link)) router.push(n.link);
  };

  const readAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, leida: true })));
    setUnread(0);
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label="Notificaciones" className="relative grid size-10 place-items-center rounded-xl border border-line bg-surface transition hover:bg-surface-2">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-lost px-1 text-[11px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-[1000] mt-2 w-[min(92vw,360px)] overflow-hidden animate-rise">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display font-bold">Notificaciones</p>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
                <CheckCheck size={14} /> Marcar todo leído
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-sm text-muted">
                <Inbox /> Sin notificaciones por ahora
              </div>
            ) : (
              items.map((n) => (
                <button key={n.id} onClick={() => openItem(n)} className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-surface-2 ${n.leida ? '' : 'bg-accent/5'}`}>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.leida ? 'bg-transparent' : 'bg-accent'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{n.titulo}</span>
                    {n.cuerpo && <span className="line-clamp-2 block text-xs text-muted">{n.cuerpo}</span>}
                    <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
