// Pruebas de seguridad de la base de datos (RLS, triggers y restricciones).
// Corre las migraciones reales sobre un PostgreSQL en memoria (PGlite)
// que simula los esquemas auth y storage de Supabase.
// Ejecutar con: npm run test:db
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'infra', 'supabase');
const FILES = ['migrations/001_schema.sql', 'migrations/002_rls.sql', 'migrations/003_storage.sql', 'seed.sql'];
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

let db;
let itemId;
let claimId;

// Ejecuta SQL como un usuario autenticado concreto
async function asUser(uid, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role');
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    create publication supabase_realtime;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated;
  `);
  for (const f of FILES) await db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;
    revoke update on public.notifications from authenticated; grant update (leida) on public.notifications to authenticated;`);
});

test('las migraciones se pueden ejecutar dos veces (idempotentes)', async () => {
  for (const f of FILES) await db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
});

test('solo se permiten correos institucionales', async () => {
  await assert.rejects(db.exec(`insert into auth.users values ('${C}', 'x@gmail.com', '{}')`), /institucionales/);
  await db.exec(`insert into auth.users values
    ('${A}', 'a@celaya.tecnm.mx', '{"nombre":"Ana"}'),
    ('${B}', 'b@celaya.tecnm.mx', '{"nombre":"Beto"}'),
    ('${C}', 'c@celaya.tecnm.mx', '{}')`);
  const { rows } = await db.query(`select nombre, rol from public.profiles where id = '${A}'`);
  assert.deepEqual(rows[0], { nombre: 'Ana', rol: 'alumno' });
});

test('un usuario no puede darse rol de administrador', async () => {
  await assert.rejects(asUser(A, `update public.profiles set rol = 'admin' where id = '${A}'`), /rol/);
});

test('un usuario no puede crear reportes a nombre de otro', async () => {
  await assert.rejects(
    asUser(A, `insert into public.items (user_id, tipo, titulo, category_id, color, zona, fecha) values ('${B}', 'perdido', 'Falso', 1, 'negro', 'Biblioteca', current_date)`),
    /row-level security/,
  );
  const r = await asUser(
    A,
    `insert into public.items (user_id, tipo, titulo, category_id, color, zona, fecha, pregunta_verificacion)
     values ('${A}', 'encontrado', 'Cartera negra', 2, 'negro', 'Biblioteca', current_date, '¿Qué tenía?') returning id`,
  );
  itemId = r.rows[0].id;
});

test('un objeto encontrado exige pregunta de verificación', async () => {
  await assert.rejects(
    asUser(A, `insert into public.items (user_id, tipo, titulo, category_id, color, zona, fecha) values ('${A}', 'encontrado', 'Sin pregunta', 1, 'negro', 'Biblioteca', current_date)`),
  );
});

test('nadie edita reportes ajenos y el dueño no puede marcarlos como devueltos', async () => {
  const r = await asUser(B, `update public.items set titulo = 'hackeado' where id = '${itemId}' returning id`);
  assert.equal(r.rows.length, 0);
  await assert.rejects(asUser(A, `update public.items set estado = 'devuelto' where id = '${itemId}'`), /Estado no permitido/);
});

test('no se puede reclamar un objeto propio', async () => {
  await assert.rejects(asUser(A, `insert into public.claims (item_id, claimant_id, respuesta) values ('${itemId}', '${A}', 'mía')`), /row-level security/);
  const r = await asUser(B, `insert into public.claims (item_id, claimant_id, respuesta) values ('${itemId}', '${B}', 'credencial') returning id`);
  claimId = r.rows[0].id;
});

test('un usuario no puede aprobar su propio reclamo', async () => {
  const r = await asUser(B, `update public.claims set estado = 'aprobado' where id = '${claimId}' returning id`);
  assert.equal(r.rows.length, 0);
});

test('solo los participantes ven el reclamo y su chat', async () => {
  await asUser(B, `insert into public.messages (claim_id, sender_id, contenido) values ('${claimId}', '${B}', 'hola')`);
  assert.equal((await asUser(A, 'select * from public.messages')).rows.length, 1);
  assert.equal((await asUser(C, 'select * from public.messages')).rows.length, 0);
  assert.equal((await asUser(C, 'select * from public.claims')).rows.length, 0);
  await assert.rejects(asUser(C, `insert into public.messages (claim_id, sender_id, contenido) values ('${claimId}', '${C}', 'intruso')`));
});

test('las notificaciones son privadas y solo se puede cambiar "leida"', async () => {
  await db.exec(`insert into public.notifications (user_id, tipo, titulo, link) values ('${A}', 'match', 'Hola', '/objeto/1')`);
  await assert.rejects(db.exec(`insert into public.notifications (user_id, tipo, titulo, link) values ('${A}', 'match', 'x', '//sitio-malicioso.com')`));
  assert.equal((await asUser(B, 'select * from public.notifications')).rows.length, 0);
  await assert.rejects(asUser(A, `update public.notifications set titulo = 'cambiado'`), /permission denied/);
  assert.equal((await asUser(A, 'update public.notifications set leida = true returning id')).rows.length, 1);
});

test('el bucket de imágenes es privado y limitado a 5 MB', async () => {
  const { rows } = await db.query(`select public, file_size_limit from storage.buckets where id = 'item-images'`);
  assert.equal(rows[0].public, false);
  assert.equal(Number(rows[0].file_size_limit), 5242880);
});
