'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Hand, ImagePlus, MapPin, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { LocationPicker } from '@/components/MapLoader';
import { CategoryIcon, ColorDot, Spinner } from '@/components/ui';
import { useCategories } from '@/components/useCategories';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { BUCKET, supabase } from '@/lib/supabase';
import { COLORES, ZONAS } from '@/lib/campus';
import { compressImage, today } from '@/lib/format';

const STEPS = ['Tipo', 'Detalles', 'Ubicación', 'Confirmar'];

function ReportarForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const cats = useCategories();
  const initialTipo = ['perdido', 'encontrado'].includes(params.get('tipo')) ? params.get('tipo') : '';

  const [step, setStep] = useState(initialTipo ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState(null); // { blob, preview }
  const [form, setForm] = useState({
    tipo: initialTipo,
    titulo: '',
    descripcion: '',
    category_id: '',
    color: '',
    zona: '',
    fecha: today(),
    en_resguardo: false,
    pregunta_verificacion: '',
    pos: null,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const lost = form.tipo === 'perdido';

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await compressImage(file);
      setImage({ blob, preview: URL.createObjectURL(blob) });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const validStep = () => {
    if (step === 0) return !!form.tipo;
    if (step === 1) {
      if (form.titulo.trim().length < 3) return toast.error('Escribe un título (mínimo 3 caracteres)'), false;
      if (!form.category_id) return toast.error('Elige una categoría'), false;
      if (!form.color) return toast.error('Elige el color principal'), false;
      if (!lost && form.pregunta_verificacion.trim().length < 5) return toast.error('Escribe una pregunta de verificación'), false;
    }
    if (step === 2 && !form.zona) return toast.error('Elige la zona del campus'), false;
    return true;
  };

  const next = () => validStep() && setStep((s) => Math.min(3, s + 1));

  const submit = async () => {
    setSaving(true);
    try {
      let image_path;
      if (image) {
        image_path = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from(BUCKET).upload(image_path, image.blob, { contentType: 'image/webp', upsert: false });
        if (error) throw new Error('No se pudo subir la imagen');
      }
      const body = {
        tipo: form.tipo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        category_id: Number(form.category_id),
        color: form.color,
        zona: form.zona,
        fecha: form.fecha,
        en_resguardo: lost ? false : form.en_resguardo,
        ...(image_path && { image_path }),
        ...(form.pos && { lat: form.pos.lat, lng: form.pos.lng }),
        ...(!lost && { pregunta_verificacion: form.pregunta_verificacion }),
      };
      const item = await api('/items', { method: 'POST', body });
      toast.success('¡Reporte publicado! Buscando coincidencias…');
      router.push(`/objeto/${item.id}?nuevo=1`);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  const cat = cats.find((c) => String(c.id) === String(form.category_id));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold md:text-4xl">Nuevo reporte</h1>

      {/* Indicador de pasos */}
      <ol className="mb-8 mt-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${i < step ? 'bg-found text-white' : i === step ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${i === step ? 'text-ink' : 'text-muted'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <div className="card p-5 md:p-7 animate-rise" key={step}>
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold">¿Qué quieres reportar?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { v: 'perdido', icon: Search, t: 'Perdí algo', d: 'Lo publicamos y te avisamos si alguien lo encuentra.', c: 'lost' },
                { v: 'encontrado', icon: Hand, t: 'Encontré algo', d: 'Ayuda a que regrese con su dueño.', c: 'found' },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => {
                    set('tipo', o.v);
                    setStep(1);
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition hover:-translate-y-0.5 ${form.tipo === o.v ? (o.c === 'lost' ? 'border-lost' : 'border-found') : 'border-line'} ${o.c === 'lost' ? 'hover:border-lost' : 'hover:border-found'}`}
                >
                  <span className={`mb-4 grid size-12 place-items-center rounded-xl ${o.c === 'lost' ? 'bg-lost-soft text-lost' : 'bg-found-soft text-found'}`}>
                    <o.icon size={24} />
                  </span>
                  <span className="block font-display text-lg font-bold">{o.t}</span>
                  <span className="mt-1 block text-sm text-muted">{o.d}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <span className="label">Foto (opcional, recomendada)</span>
              {image ? (
                <div className="relative overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.preview} alt="Vista previa" className="max-h-72 w-full object-cover" />
                  <button onClick={() => setImage(null)} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/60 text-white" aria-label="Quitar foto">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center text-muted transition hover:border-accent hover:text-ink">
                  <ImagePlus size={28} />
                  <span className="text-sm font-semibold">Toma o sube una foto</span>
                  <span className="text-xs">JPG, PNG o WebP. Se eliminan los datos de ubicación de la foto.</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />
                </label>
              )}
            </div>

            <div>
              <label className="label" htmlFor="titulo">Título</label>
              <input id="titulo" className="input" maxLength={80} placeholder={lost ? 'Ej. Cartera negra de piel' : 'Ej. Audífonos blancos'} value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
            </div>

            <div>
              <span className="label">Categoría</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set('category_id', c.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition ${String(form.category_id) === String(c.id) ? 'border-accent bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink'}`}
                  >
                    <CategoryIcon name={c.icono} />
                    <span className="line-clamp-2">{c.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label">Color principal</span>
              <div className="flex flex-wrap gap-2">
                {Object.keys(COLORES).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${form.color === c ? 'border-accent bg-accent/10' : 'border-line text-muted'}`}
                  >
                    <ColorDot color={c} /> {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="descripcion">Descripción</label>
              <textarea id="descripcion" rows={3} maxLength={500} className="input resize-none" placeholder="Marca, detalles, estampas… (sin datos personales)" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
              <p className="mt-1 text-right text-xs text-muted">{form.descripcion.length}/500</p>
            </div>

            <div>
              <label className="label" htmlFor="fecha">{lost ? '¿Cuándo lo perdiste?' : '¿Cuándo lo encontraste?'}</label>
              <input id="fecha" type="date" className="input" max={today()} value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </div>

            {!lost && (
              <>
                <div className="rounded-2xl bg-accent/10 p-4">
                  <label className="label" htmlFor="pregunta">Pregunta de verificación</label>
                  <input id="pregunta" className="input" maxLength={150} placeholder="Ej. ¿Qué credencial tenía dentro?" value={form.pregunta_verificacion} onChange={(e) => set('pregunta_verificacion', e.target.value)} />
                  <p className="mt-2 text-xs text-muted">Quien diga que es suyo tendrá que responderla. No pongas la respuesta en la descripción.</p>
                </div>
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={form.en_resguardo} onChange={(e) => set('en_resguardo', e.target.checked)} />
                  Lo dejé en el área de resguardo (prefectura / vigilancia)
                </label>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="zona">Zona del campus</label>
              <select id="zona" className="input" value={form.zona} onChange={(e) => set('zona', e.target.value)}>
                <option value="">Elige una zona…</option>
                {ZONAS.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Marca el punto exacto (opcional)</span>
              <div className="overflow-hidden rounded-2xl border border-line">
                <LocationPicker value={form.pos} onChange={(p) => set('pos', p)} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                <MapPin size={13} /> {form.pos ? 'Ubicación marcada. Toca otro punto para cambiarla.' : 'Toca el mapa dentro del área del campus.'}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold">Revisa tu reporte</h2>
            <dl className="mt-4 divide-y divide-line text-sm">
              {[
                ['Tipo', lost ? 'Objeto perdido' : 'Objeto encontrado'],
                ['Título', form.titulo],
                ['Categoría', cat?.nombre],
                ['Color', form.color],
                ['Zona', form.zona],
                ['Fecha', form.fecha],
                ['Foto', image ? 'Sí' : 'No'],
                ['Punto en el mapa', form.pos ? 'Sí' : 'No'],
                ...(!lost ? [['Pregunta', form.pregunta_verificacion]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-8 flex justify-between gap-3">
          {step > 0 ? (
            <button className="btn-ghost" onClick={() => setStep(step - 1)} disabled={saving}>
              <ArrowLeft size={16} /> Atrás
            </button>
          ) : (
            <span />
          )}
          {step > 0 && step < 3 && (
            <button className="btn-dark" onClick={next}>
              Siguiente <ArrowRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button className="btn-primary px-6" onClick={submit} disabled={saving}>
              {saving ? <Spinner /> : <><Check size={18} /> Publicar reporte</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportarPage() {
  return (
    <Suspense>
      <ReportarForm />
    </Suspense>
  );
}
