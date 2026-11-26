'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, ScanLine, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';

// Escáner de QR para confirmar entregas (resguardo, admin o quien encontró el objeto)
export default function EscanearPage() {
  const scannerRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | scanning | verifying | ok | error
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');

  const stop = async () => {
    try {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    } catch {}
  };

  const verify = async (token) => {
    await stop();
    setState('verifying');
    try {
      const r = await api('/claims/verify-qr', { method: 'POST', body: { token } });
      setResult(r);
      setState('ok');
      navigator.vibrate?.(120);
    } catch (e) {
      setResult({ error: e.message });
      setState('error');
    }
  };

  const start = async () => {
    setResult(null);
    setState('scanning');
    const { Html5Qrcode } = await import('html5-qrcode');
    // Espera a que el contenedor exista en el DOM
    await new Promise((r) => requestAnimationFrame(r));
    const scanner = new Html5Qrcode('qr-reader', { verbose: false });
    scannerRef.current = scanner;
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => verify(text), () => {});
    } catch {
      setResult({ error: 'No se pudo acceder a la cámara. Revisa los permisos del navegador.' });
      setState('error');
    }
  };

  useEffect(() => () => void stop(), []);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-extrabold">Confirmar entrega</h1>
      <p className="mt-1 text-muted">Escanea el código QR que muestra el dueño del objeto.</p>

      <div className="card mt-6 overflow-hidden p-4">
        {state === 'scanning' && (
          <div>
            <div id="qr-reader" className="overflow-hidden rounded-xl" />
            <button className="btn-ghost mt-3 w-full" onClick={() => stop().then(() => setState('idle'))}>
              Cancelar
            </button>
          </div>
        )}

        {state === 'idle' && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="relative grid size-28 place-items-center rounded-3xl bg-accent/15 text-accent">
              <ScanLine size={52} />
            </div>
            <button className="btn-primary mt-6 px-6 py-3" onClick={start}>
              <Camera size={18} /> Abrir cámara
            </button>
          </div>
        )}

        {state === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-14 text-muted">
            <Spinner /> Verificando código…
          </div>
        )}

        {state === 'ok' && (
          <div className="flex flex-col items-center py-8 text-center animate-rise">
            <span className="grid size-20 place-items-center rounded-full bg-found text-white">
              <Check size={40} />
            </span>
            <p className="mt-4 font-display text-2xl font-bold">¡Entrega confirmada!</p>
            <p className="mt-1 text-muted">
              <b className="text-ink">{result.objeto}</b> fue entregado a {result.entregado_a}.
            </p>
            <button className="btn-ghost mt-6" onClick={() => setState('idle')}>
              <RefreshCw size={16} /> Escanear otro
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center py-8 text-center animate-rise">
            <span className="grid size-20 place-items-center rounded-full bg-lost text-white">
              <X size={40} />
            </span>
            <p className="mt-4 font-display text-xl font-bold">No se pudo confirmar</p>
            <p className="mt-1 text-sm text-muted">{result?.error}</p>
            <button className="btn-ghost mt-6" onClick={() => setState('idle')}>
              <RefreshCw size={16} /> Intentar de nuevo
            </button>
          </div>
        )}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-muted">¿La cámara no funciona? Pega el código</summary>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) verify(manual.trim());
          }}
        >
          <input className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código del QR" />
          <button className="btn-dark">Validar</button>
        </form>
      </details>
    </div>
  );
}
