-- =====================================================================
-- LostCampus · Datos iniciales
-- =====================================================================

insert into public.allowed_domains (domain) values
  ('celaya.tecnm.mx')
on conflict do nothing;

-- Para probar con un correo personal durante el desarrollo, descomenta
-- la siguiente línea (y bórrala antes de la entrega final):
-- insert into public.allowed_domains (domain) values ('gmail.com') on conflict do nothing;

insert into public.categories (nombre, icono) values
  ('Electrónicos', 'smartphone'),
  ('Cartera o monedero', 'wallet'),
  ('Llaves', 'key-round'),
  ('Credencial o identificación', 'id-card'),
  ('Mochila o bolsa', 'backpack'),
  ('Libros y cuadernos', 'book-open'),
  ('Ropa', 'shirt'),
  ('Lentes', 'glasses'),
  ('Termo o botella', 'cup-soda'),
  ('Audífonos', 'headphones'),
  ('Calculadora', 'calculator'),
  ('Otro', 'package')
on conflict (nombre) do nothing;

-- Para dar rol de administrador o resguardo a una cuenta (después de que se registre):
-- update public.profiles set rol = 'admin'
--   where id = (select id from auth.users where email = 'correo@celaya.tecnm.mx');
