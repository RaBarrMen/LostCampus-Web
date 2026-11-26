const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });

export function timeAgo(date) {
  const diff = (new Date(date) - Date.now()) / 1000;
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'justo ahora';
}

export function formatDate(date) {
  return new Date(`${String(date).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// Reduce la imagen a 1280 px y la convierte a WebP.
// Además elimina los metadatos EXIF (incluida la ubicación GPS de la foto).
export async function compressImage(file, max = 1280, quality = 0.82) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato no permitido (usa JPG, PNG o WebP)');
  }
  if (file.size > 15 * 1024 * 1024) throw new Error('La imagen es demasiado grande');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('No se pudo procesar la imagen');
  return blob;
}
