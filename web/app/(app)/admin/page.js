'use client';
import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, EstadoBadge, PageLoader, TipoBadge } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

const tooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' } };
const ESTADO_COLOR = { activo: '#5b6275', en_proceso: '#f5a524', devuelto: '#12a150', cerrado: '#9aa3b8' };

function Stat({ label, value, accent }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-display text-4xl font-extrabold ${accent || ''}`}>{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const isAdmin = profile?.rol === 'admin';
  const allowed = ['admin', 'resguardo'].includes(profile?.rol);

  useEffect(() => {
    if (!allowed) return;
    api('/admin/stats').then(setStats).catch((e) => toast.error(e.message));
    if (isAdmin) api('/admin/items').then(setItems).catch(() => {});
  }, [allowed, isAdmin]);

  if (profile && !allowed) return <EmptyState icon={Lock} title="Acceso restringido">Esta sección es solo para administradores y personal de resguardo.</EmptyState>;
  if (!stats) return <PageLoader />;

  const hide = async (id) => {
    if (!confirm('¿Ocultar este reporte del público?')) return;
    try {
      await api(`/admin/items/${id}/hide`, { method: 'PATCH' });
      setItems((list) => list.map((i) => (i.id === id ? { ...i, estado: 'oculto' } : i)));
      toast.success('Reporte ocultado');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold md:text-4xl">Panel de administración</h1>
      <p className="text-muted">Resumen de la actividad en LostCampus.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Reportes totales" value={stats.total} />
        <Stat label="Activos" value={stats.activos} />
        <Stat label="Devueltos" value={stats.devueltos} accent="text-found" />
        <Stat label="Tasa de devolución" value={`${stats.tasa_devolucion}%`} accent="text-accent" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <p className="font-display font-bold">Reportes de los últimos 30 días</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={stats.por_dia}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5a524" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f5a524" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={(d) => d.slice(8)} stroke="var(--muted)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={12} width={28} />
                <Tooltip {...tooltip} />
                <Area type="monotone" dataKey="total" name="Reportes" stroke="#f5a524" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <p className="font-display font-bold">Por estado</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.por_estado} dataKey="total" nameKey="nombre" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {stats.por_estado.map((e) => (
                    <Cell key={e.nombre} fill={ESTADO_COLOR[e.nombre] || '#8ea2ff'} />
                  ))}
                </Pie>
                <Tooltip {...tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <p className="font-display font-bold">Categorías más reportadas</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={stats.por_categoria.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} stroke="var(--muted)" fontSize={12} />
                <YAxis type="category" dataKey="nombre" width={140} stroke="var(--muted)" fontSize={12} />
                <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="total" name="Reportes" fill="var(--brand)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <p className="font-display font-bold">Zonas con más reportes</p>
          <ul className="mt-4 space-y-3">
            {stats.por_zona.map((z) => (
              <li key={z.nombre}>
                <div className="flex justify-between text-sm">
                  <span>{z.nombre}</span>
                  <b>{z.total}</b>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-2">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${(z.total / (stats.por_zona[0]?.total || 1)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isAdmin && (
        <div className="card mt-4 overflow-x-auto">
          <p className="p-5 pb-3 font-display font-bold">Moderación · últimos reportes</p>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-y border-line">
                <th className="px-5 py-2 font-medium">Objeto</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">Autor</th>
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-semibold">{i.titulo}</td>
                  <td className="px-2"><TipoBadge tipo={i.tipo} /></td>
                  <td className="px-2"><EstadoBadge estado={i.estado} /></td>
                  <td className="px-2 text-muted">{i.profiles?.nombre || '—'}</td>
                  <td className="px-2 text-muted">{timeAgo(i.created_at)}</td>
                  <td className="px-5 text-right">
                    {i.estado !== 'oculto' && (
                      <button onClick={() => hide(i.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-lost">
                        <EyeOff size={14} /> Ocultar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
