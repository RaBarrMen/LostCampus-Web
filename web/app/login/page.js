'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';

// Solo se permite redirigir a rutas internas (evita open redirect)
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/inicio');

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      // Mensaje genérico: no revela si el correo existe
      toast.error(error.message.includes('Email not confirmed') ? 'Confirma tu correo antes de entrar' : 'Correo o contraseña incorrectos');
      return;
    }
    router.replace(next);
  };

  const reset = async () => {
    if (!email) return toast.info('Escribe tu correo y vuelve a presionar');
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}/perfil` });
    toast.success('Si el correo está registrado, te enviamos un enlace para cambiar la contraseña');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Correo institucional</label>
        <input id="email" type="email" className="input" placeholder="l21030000@celaya.tecnm.mx" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Contraseña</label>
          <button type="button" onClick={reset} className="mb-1.5 text-xs font-semibold text-muted hover:text-ink">¿La olvidaste?</button>
        </div>
        <div className="relative">
          <input id="password" type={show ? 'text' : 'password'} className="input pr-11" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="button" onClick={() => setShow(!show)} aria-label="Mostrar contraseña" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <button className="btn-primary w-full py-3" disabled={loading}>
        {loading ? <Spinner /> : 'Entrar'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Entra con tu cuenta del Tec para ver y reportar objetos."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="font-semibold text-ink underline underline-offset-4">Regístrate</Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
