'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClipboardList, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const ROL = { alumno: 'Alumno', resguardo: 'Resguardo', admin: 'Administrador' };

export default function PerfilPage() {
  const { profile, user, signOut, reloadProfile } = useAuth();
  const [form, setForm] = useState({ nombre: '', carrera: '' });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ nombre: profile.nombre || '', carrera: profile.carrera || '' });
  }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {};
      if (form.nombre.trim()) body.nombre = form.nombre.trim();
      if (form.carrera.trim()) body.carrera = form.carrera.trim();
      await api('/profile', { method: 'PATCH', body });
      await reloadProfile();
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (password.length < 8 || !/\d/.test(password) || !/[A-Z]/.test(password)) {
      return toast.error('Usa al menos 8 caracteres, un número y una mayúscula');
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error('No se pudo cambiar la contraseña');
    setPassword('');
    toast.success('Contraseña actualizada');
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card flex items-center gap-4 p-5">
        <span className="grid size-16 place-items-center rounded-2xl bg-ink font-display text-2xl font-bold text-bg">
          {(profile?.nombre || user?.email || '?').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-bold">{profile?.nombre || 'Sin nombre'}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          <span className="chip mt-1 bg-accent/15 text-accent-ink dark:text-accent">
            <ShieldCheck size={12} /> {ROL[profile?.rol] || '—'}
          </span>
        </div>
        <ThemeToggle />
      </div>

      <Link href="/mis-reportes" className="card flex items-center gap-3 p-4 font-semibold md:hidden">
        <ClipboardList size={18} /> Mis reportes
      </Link>

      <form onSubmit={save} className="card space-y-4 p-5">
        <p className="font-display text-lg font-bold">Datos del perfil</p>
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input id="nombre" className="input" maxLength={80} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="carrera">Carrera</label>
          <input id="carrera" className="input" maxLength={80} placeholder="Ej. Ingeniería en Sistemas Computacionales" value={form.carrera} onChange={(e) => setForm({ ...form, carrera: e.target.value })} />
        </div>
        <button className="btn-dark" disabled={saving}>{saving ? <Spinner /> : 'Guardar cambios'}</button>
      </form>

      <form onSubmit={changePassword} className="card space-y-4 p-5">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <Lock size={18} /> Cambiar contraseña
        </p>
        <input type="password" className="input" placeholder="Nueva contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-ghost">Actualizar contraseña</button>
      </form>

      <button onClick={signOut} className="btn-ghost w-full text-lost">
        <LogOut size={18} /> Cerrar sesión
      </button>
    </div>
  );
}
