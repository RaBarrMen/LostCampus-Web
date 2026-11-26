// Las imágenes viven en un bucket privado; se entregan con URLs firmadas
// que expiran en 1 hora.
const { adminClient } = require('./supabase');

const BUCKET = 'item-images';
const TTL = 60 * 60;

async function signImages(items) {
  const list = Array.isArray(items) ? items : [items];
  const paths = [...new Set(list.map((i) => i && i.image_path).filter(Boolean))];
  if (!paths.length) return items;
  const { data, error } = await adminClient().storage.from(BUCKET).createSignedUrls(paths, TTL);
  if (error) return items;
  const map = new Map(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  for (const it of list) {
    if (it && it.image_path) it.image_url = map.get(it.image_path) || null;
  }
  return items;
}

module.exports = { signImages, BUCKET };
