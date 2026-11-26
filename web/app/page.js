'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Camera, MapPin, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

function Counter({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value) return;
    let frame;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return n.toLocaleString('es-MX');
}

const FLOATING = [
  { t: 'Audífonos blancos', z: 'Biblioteca', tipo: 'encontrado', r: '-6deg', pos: 'left-0 top-6', d: '0s' },
  { t: 'Credencial ISC', z: 'Cafetería', tipo: 'perdido', r: '4deg', pos: 'right-2 top-0', d: '1.2s' },
  { t: 'Termo azul', z: 'Canchas', tipo: 'encontrado', r: '3deg', pos: 'left-0 bottom-0', d: '2.1s' },
  { t: 'Calculadora Casio', z: 'Edificio de Sistemas', tipo: 'perdido', r: '-3deg', pos: 'right-0 bottom-24', d: '0.6s' },
];

const STEPS = [
  { icon: Camera, title: 'Reporta en segundos', text: 'Sube una foto, elige la categoría y marca en el mapa dónde lo perdiste o encontraste.' },
  { icon: Sparkles, title: 'Coincidencias automáticas', text: 'Comparamos categoría, color, lugar y fecha para avisarte cuando aparece algo parecido.' },
  { icon: ShieldCheck, title: 'Verificación del dueño', text: 'Quien reclama responde una pregunta que solo el dueño real sabría contestar.' },
  { icon: QrCode, title: 'Entrega con QR', text: 'El objeto se entrega escaneando un código QR de un solo uso. Sin confusiones.' },
];

export default function Landing() {
  const { session } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/stats/public', { auth: false }).then(setStats).catch(() => setStats({ reportes: 0, devueltos: 0 }));
  }, []);

  return (
    <div className="min-h-dvh">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-[#111a36] text-white">
        <div className="dot-grid absolute inset-0" />
        <div className="absolute -right-40 -top-40 size-[520px] rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-52 -left-32 size-[420px] rounded-full bg-[#4f6bff]/25 blur-3xl" />

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Logo light />
          <div className="flex items-center gap-2">
            <ThemeToggle className="border-white/15 bg-white/5 text-white hover:bg-white/10" />
            <Link href={session ? '/inicio' : '/login'} className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
              {session ? 'Abrir app' : 'Iniciar sesión'}
            </Link>
          </div>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-10 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
          <div className="animate-rise">
            <span className="chip mb-6 border border-white/15 bg-white/5 text-white/80">
              <MapPin size={13} className="text-accent" /> Tecnológico Nacional de México · Celaya
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl md:text-7xl">
              Lo que se pierde en el Tec, <span className="text-accent">aparece aquí.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              LostCampus reúne todos los reportes de objetos perdidos y encontrados del campus en un solo lugar, con mapa, coincidencias automáticas y entrega segura.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={session ? '/reportar' : '/registro'} className="btn-primary px-6 py-3 text-base">
                Reportar un objeto <ArrowRight size={18} />
              </Link>
              <Link href={session ? '/mapa' : '/login'} className="btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">
                Ver el mapa
              </Link>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-2 gap-6">
              <div>
                <dt className="text-sm text-white/50">Reportes registrados</dt>
                <dd className="font-display text-4xl font-extrabold">{stats ? <Counter value={stats.reportes} /> : '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-white/50">Objetos devueltos</dt>
                <dd className="font-display text-4xl font-extrabold text-accent">{stats ? <Counter value={stats.devueltos} /> : '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Tarjetas flotantes decorativas */}
          <div className="relative hidden h-[420px] md:block" aria-hidden>
            <div className="absolute left-1/2 top-1/2 grid size-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-white/5">
              <div className="grid size-24 place-items-center rounded-full border border-white/15 bg-white/5">
                <MapPin size={34} className="text-accent" />
              </div>
            </div>
            {FLOATING.map((f) => (
              <div
                key={f.t}
                className={`animate-float absolute ${f.pos} w-56 rounded-2xl border border-white/10 bg-white/95 p-3 text-[#141a2e] shadow-2xl`}
                style={{ '--r': f.r, animationDelay: f.d }}
              >
                <div className="flex items-center justify-between">
                  <span className={`chip ${f.tipo === 'perdido' ? 'bg-[#fde8e8] text-[#e5484d]' : 'bg-[#e1f5e9] text-[#12a150]'}`}>
                    {f.tipo === 'perdido' ? 'Perdido' : 'Encontrado'}
                  </span>
                  <span className="text-[11px] text-[#5b6275]">hace 2 h</span>
                </div>
                <p className="mt-2 font-display font-bold">{f.t}</p>
                <p className="flex items-center gap-1 text-xs text-[#5b6275]">
                  <MapPin size={12} /> {f.z}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Cómo funciona ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Cómo funciona</p>
        <h2 className="mt-2 max-w-xl text-4xl font-extrabold">De “lo perdí” a “ya lo tengo” en cuatro pasos</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card p-6 animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mb-5 flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent">
                  <s.icon size={22} />
                </div>
                <span className="font-display text-3xl font-extrabold text-line">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="card flex flex-col items-start justify-between gap-6 bg-ink p-8 text-bg sm:flex-row sm:items-center md:p-12">
          <div>
            <h2 className="text-3xl font-extrabold">¿Encontraste algo que no es tuyo?</h2>
            <p className="mt-2 text-bg/70">Repórtalo y te avisaremos en cuanto su dueño lo reclame.</p>
          </div>
          <Link href={session ? '/reportar?tipo=encontrado' : '/registro'} className="btn-primary px-6 py-3 text-base">
            <Bell size={18} /> Reportar lo que encontré
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        LostCampus · Proyecto de Programación Web · Tecnológico de Celaya
      </footer>
    </div>
  );
}
