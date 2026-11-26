'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CircleCheck, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_DOMAINS || 'celaya.tecnm.mx').split(',').map((d) => d.trim().toLowerCase());

const RULES = [
  { test: (p) => p.length >= 8, text: 'Al menos 8 caracteres' },
  { test: (p) => /[A-Za-z]/.test(p) && /\d/.test(p), text: 'Letras y números' },
  { test: (p) => /[A-Z]/.test(p), text: 'Una mayúscula' },
];

export default function RegistroPage() {
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!DOMAINS.includes(email.split('@')[1])) return toast.error(`Usa tu correo institucional (@${DOMAINS[0]})`);
    if (!RULES.every((r) => r.test(form.password))) return toast.error('La contraseña no cumple los requisitos');
    if (form.nombre.trim().length < 2) return toast.error('Escribe tu nombre');

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { nombre: form.nombre.trim() }, emailRedirectTo: `${location.origin}/login` },
    });
    setLoading(false);
    if (error) return toast.error(error.message.includes('Database error') ? 'Solo se permiten correos institucionales' : 'No se pudo crear la cuenta');
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Revisa tu correo" subtitle="Te enviamos un enlace para confirmar tu cuenta.">
        <div className="card flex items-start gap-3 p-5">
          <Mail className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm text-muted">
            Abre el correo que enviamos a <b className="text-ink">{form.email}</b> y confirma tu cuenta. Después podrás{' '}
            <Link href="/login" className="font-semibold text-ink underline">iniciar sesión</Link>.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Solo para alumnos y personal del Tecnológico de Celaya."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">Inicia sesión</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input id="nombre" className="input" value={form.nombre} onChange={set('nombre')} maxLength={80} required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo institucional</label>
          <input id="email" type="email" className="input" placeholder={`tu.correo@${DOMAINS[0]}`} value={form.email} onChange={set('email')} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="input" value={form.password} onChange={set('password')} required autoComplete="new-password" />
          <ul className="mt-2 space-y-1">
            {RULES.map((r) => (
              <li key={r.text} className={`flex items-center gap-1.5 text-xs ${r.test(form.password) ? 'text-found' : 'text-muted'}`}>
                <CircleCheck size={13} /> {r.text}
              </li>
            ))}
          </ul>
        </div>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner /> : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  );
}
