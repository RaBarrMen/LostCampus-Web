import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-display text-8xl font-extrabold text-accent">404</p>
        <h1 className="mt-2 text-2xl font-bold">Esta página también se perdió</h1>
        <p className="mt-1 text-muted">Pero a diferencia de tus cosas, esta no la vamos a encontrar.</p>
        <Link href="/" className="btn-primary mt-6">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
