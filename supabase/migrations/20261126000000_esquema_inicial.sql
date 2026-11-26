-- =====================================================================
-- INVITACIONES DE GRADUACIÓN — ESQUEMA INICIAL
-- Ejecutar una vez en Supabase (SQL Editor) o con `supabase db push`.
--
-- Roles de la app (tabla perfiles):
--   superadmin : gestiona colegios y usuarios de todos los colegios
--   profesor   : crea alumnos de SU colegio y supervisa sus invitaciones
--   alumno     : edita y publica SU propia invitación
--
-- Los usuarios se crean SOLO desde la Edge Function `gestionar-usuarios`
-- (usa la service_role key). Nadie puede insertarse un perfil desde el navegador.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- TIPOS
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('superadmin', 'profesor', 'alumno');
create type public.genero_graduado as enum ('masculino', 'femenino', 'neutro');

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------
create table public.colegios (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null check (char_length(nombre) between 3 and 120),
  ciudad           text not null default '' check (char_length(ciudad) <= 80),
  fundacion        int check (fundacion between 1800 and 2100),
  lema             text check (char_length(lema) <= 160),
  escudo_url       text check (char_length(escudo_url) <= 500),
  color_primario   text not null default '#d2161e' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  color_secundario text not null default '#121212' check (color_secundario ~ '^#[0-9a-fA-F]{6}$'),
  created_at       timestamptz not null default now()
);

create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  rol         public.rol_usuario not null,
  nombre      text not null check (char_length(nombre) between 2 and 120),
  email       text not null,
  colegio_id  uuid references public.colegios (id) on delete restrict,
  creado_por  uuid references public.perfiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  -- profesores y alumnos siempre pertenecen a un colegio
  constraint perfil_colegio_requerido check (rol = 'superadmin' or colegio_id is not null)
);
create index perfiles_colegio_idx on public.perfiles (colegio_id);

-- Palabras que no pueden usarse como ruta de una invitación
create function public.slug_reservado(p text) returns boolean
language sql immutable as $$
  select p = any (array[
    'admin','panel','login','api','assets','img','static','public','preview',
    'novamark','invitacion','invitaciones','www','app','favicon','robots'
  ]);
$$;

create table public.invitaciones (
  id                  uuid primary key default gen_random_uuid(),
  alumno_id           uuid not null unique references public.perfiles (id) on delete cascade,
  colegio_id          uuid not null references public.colegios (id) on delete restrict,
  slug                text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                             and char_length(slug) between 3 and 60
                             and not public.slug_reservado(slug)),
  publicada           boolean not null default false,
  preview_token       uuid not null default gen_random_uuid(),

  -- graduado
  nombres             text not null default '' check (char_length(nombres) <= 60),
  apellidos           text not null default '' check (char_length(apellidos) <= 60),
  apodo               text not null default '' check (char_length(apodo) <= 30),
  genero              public.genero_graduado not null default 'neutro',
  titulo              text not null default 'Bachiller en Humanidades' check (char_length(titulo) <= 80),
  promocion           text not null default '' check (char_length(promocion) <= 40),
  foto_url            text check (char_length(foto_url) <= 500),
  mensaje             text not null default '' check (char_length(mensaje) <= 700),
  lema                text not null default '' check (char_length(lema) <= 160),

  -- evento
  fecha_evento        timestamptz,
  dress_code_titulo   text not null default 'Formal' check (char_length(dress_code_titulo) <= 40),
  dress_code_detalle  text not null default '' check (char_length(dress_code_detalle) <= 240),
  dress_code_colores  text[] not null default '{}'
                      check (cardinality(dress_code_colores) <= 6
                             and array_to_string(dress_code_colores, ',') ~ '^(#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})*)?$'),

  -- confirmación
  whatsapp            text check (whatsapp ~ '^[0-9]{8,15}$'),
  fecha_limite        date,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index invitaciones_colegio_idx on public.invitaciones (colegio_id);

create table public.programa (
  id             uuid primary key default gen_random_uuid(),
  invitacion_id  uuid not null references public.invitaciones (id) on delete cascade,
  orden          int not null default 0,
  hora           time not null,
  titulo         text not null check (char_length(titulo) between 1 and 80),
  lugar          text not null default '' check (char_length(lugar) <= 100),
  direccion      text not null default '' check (char_length(direccion) <= 140),
  mapa_url       text check (mapa_url ~ '^https://' and char_length(mapa_url) <= 500),
  icono          text not null default 'birrete' check (icono in ('iglesia','birrete','copa','musica','foto'))
);
create index programa_invitacion_idx on public.programa (invitacion_id, orden);

create table public.mensajes (
  id             uuid primary key default gen_random_uuid(),
  invitacion_id  uuid not null references public.invitaciones (id) on delete cascade,
  nombre         text not null default 'Anónimo' check (char_length(nombre) between 1 and 40),
  texto          text not null check (char_length(texto) between 1 and 300
                   and coalesce(array_length(regexp_split_to_array(btrim(texto), '\s+'), 1), 0) <= 25),
  visible        boolean not null default true,
  created_at     timestamptz not null default now()
);
create index mensajes_invitacion_idx on public.mensajes (invitacion_id, created_at desc);

create table public.confirmaciones (
  id             uuid primary key default gen_random_uuid(),
  invitacion_id  uuid not null references public.invitaciones (id) on delete cascade,
  nombre         text not null check (char_length(nombre) between 1 and 60),
  personas       int not null default 1 check (personas between 1 and 10),
  mensaje        text not null default '' check (char_length(mensaje) <= 200),
  created_at     timestamptz not null default now()
);
create index confirmaciones_invitacion_idx on public.confirmaciones (invitacion_id, created_at desc);

-- updated_at automático
create function public.tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger invitaciones_updated_at
  before update on public.invitaciones
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- FUNCIONES DE PERMISOS (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create function public.mi_rol() returns public.rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create function public.mi_colegio() returns uuid
language sql stable security definer set search_path = public as $$
  select colegio_id from public.perfiles where id = auth.uid();
$$;

-- ¿El usuario actual puede gestionar esta invitación?
create function public.puede_gestionar(p_invitacion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.invitaciones i
    join public.perfiles p on p.id = auth.uid()
    where i.id = p_invitacion
      and (p.rol = 'superadmin'
           or (p.rol = 'alumno' and i.alumno_id = p.id)
           or (p.rol = 'profesor' and i.colegio_id = p.colegio_id))
  );
$$;

create function public.invitacion_publicada(p_invitacion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invitaciones where id = p_invitacion and publicada);
$$;

-- ---------------------------------------------------------------------
-- RPC PÚBLICA: datos completos de una invitación para la landing
-- Devuelve la invitación si está publicada, o si se pasa su preview_token.
-- ---------------------------------------------------------------------
create function public.obtener_invitacion(p_slug text, p_preview uuid default null)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'invitacion', to_jsonb(i) - 'preview_token' - 'alumno_id',
    'colegio', to_jsonb(c) - 'created_at',
    'programa', coalesce((
        select jsonb_agg(to_jsonb(p) - 'invitacion_id' order by p.orden, p.hora)
        from public.programa p where p.invitacion_id = i.id
      ), '[]'::jsonb),
    'vista_previa', not i.publicada
  )
  from public.invitaciones i
  join public.colegios c on c.id = i.colegio_id
  where i.slug = lower(p_slug)
    and (i.publicada or (p_preview is not null and i.preview_token = p_preview));
$$;

-- ¿Está libre esta ruta? (para el editor del admin)
create function public.slug_disponible(p_slug text, p_invitacion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not public.slug_reservado(lower(p_slug))
     and not exists (select 1 from public.invitaciones where slug = lower(p_slug) and id <> p_invitacion);
$$;

-- Reemplaza el programa completo de forma atómica (respeta RLS: security invoker)
create function public.guardar_programa(p_invitacion uuid, p_items jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.puede_gestionar(p_invitacion) then
    raise exception 'Sin permiso para esta invitación' using errcode = '42501';
  end if;

  delete from public.programa where invitacion_id = p_invitacion;

  insert into public.programa (invitacion_id, orden, hora, titulo, lugar, direccion, mapa_url, icono)
  select p_invitacion,
         (x.ordinality - 1)::int,
         (x.value ->> 'hora')::time,
         x.value ->> 'titulo',
         coalesce(x.value ->> 'lugar', ''),
         coalesce(x.value ->> 'direccion', ''),
         nullif(x.value ->> 'mapa_url', ''),
         coalesce(x.value ->> 'icono', 'birrete')
  from jsonb_array_elements(p_items) with ordinality as x(value, ordinality);
end $$;

-- ---------------------------------------------------------------------
-- PRIVILEGIOS (explícitos: se revoca todo y se otorga lo mínimo)
-- ---------------------------------------------------------------------
revoke all on public.colegios, public.perfiles, public.invitaciones,
              public.programa, public.mensajes, public.confirmaciones
  from anon, authenticated;

grant select on public.colegios to anon, authenticated;
grant insert, update, delete on public.colegios to authenticated;

grant select on public.perfiles to authenticated;
grant update (nombre) on public.perfiles to authenticated;

-- alumno_id, colegio_id e id NO son editables desde el navegador
grant select on public.invitaciones to authenticated;
grant update (slug, publicada, nombres, apellidos, apodo, genero, titulo, promocion,
              foto_url, mensaje, lema, fecha_evento, dress_code_titulo,
              dress_code_detalle, dress_code_colores, whatsapp, fecha_limite)
  on public.invitaciones to authenticated;
grant delete on public.invitaciones to authenticated;

grant select, insert, update, delete on public.programa to authenticated;

grant select on public.mensajes to anon, authenticated;
grant insert (invitacion_id, nombre, texto) on public.mensajes to anon, authenticated;
grant update (visible), delete on public.mensajes to authenticated;

grant insert (invitacion_id, nombre, personas, mensaje) on public.confirmaciones to anon, authenticated;
grant select, delete on public.confirmaciones to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
-- La Edge Function usa service_role (inserta perfiles e invitaciones)
grant execute on all functions in schema public to service_role;
grant select, insert, update, delete on public.colegios, public.perfiles, public.invitaciones,
      public.programa, public.mensajes, public.confirmaciones to service_role;
grant execute on function public.obtener_invitacion(text, uuid) to anon, authenticated;
grant execute on function public.slug_reservado(text) to anon, authenticated;
-- puede_gestionar aparece en políticas que también evalúa anon (devuelve false sin sesión)
grant execute on function public.invitacion_publicada(uuid), public.puede_gestionar(uuid) to anon, authenticated;
grant execute on function public.mi_rol(), public.mi_colegio(),
                         public.slug_disponible(text, uuid), public.guardar_programa(uuid, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.colegios       enable row level security;
alter table public.perfiles       enable row level security;
alter table public.invitaciones   enable row level security;
alter table public.programa       enable row level security;
alter table public.mensajes       enable row level security;
alter table public.confirmaciones enable row level security;

-- colegios
create policy colegios_leer on public.colegios
  for select to anon, authenticated using (true);
create policy colegios_crear on public.colegios
  for insert to authenticated with check (public.mi_rol() = 'superadmin');
create policy colegios_editar on public.colegios
  for update to authenticated
  using (public.mi_rol() = 'superadmin' or (public.mi_rol() = 'profesor' and id = public.mi_colegio()))
  with check (public.mi_rol() = 'superadmin' or (public.mi_rol() = 'profesor' and id = public.mi_colegio()));
create policy colegios_borrar on public.colegios
  for delete to authenticated using (public.mi_rol() = 'superadmin');

-- perfiles
create policy perfiles_leer on public.perfiles
  for select to authenticated using (
    id = auth.uid()
    or public.mi_rol() = 'superadmin'
    or (public.mi_rol() = 'profesor' and colegio_id = public.mi_colegio())
  );
create policy perfiles_editar_nombre on public.perfiles
  for update to authenticated
  using (id = auth.uid() or public.mi_rol() = 'superadmin')
  with check (id = auth.uid() or public.mi_rol() = 'superadmin');

-- invitaciones
create policy invitaciones_leer on public.invitaciones
  for select to authenticated using (public.puede_gestionar(id));
create policy invitaciones_editar on public.invitaciones
  for update to authenticated using (public.puede_gestionar(id)) with check (public.puede_gestionar(id));
create policy invitaciones_borrar on public.invitaciones
  for delete to authenticated using (public.mi_rol() = 'superadmin');

-- programa
create policy programa_leer on public.programa
  for select to authenticated using (public.puede_gestionar(invitacion_id));
create policy programa_crear on public.programa
  for insert to authenticated with check (public.puede_gestionar(invitacion_id));
create policy programa_editar on public.programa
  for update to authenticated using (public.puede_gestionar(invitacion_id)) with check (public.puede_gestionar(invitacion_id));
create policy programa_borrar on public.programa
  for delete to authenticated using (public.puede_gestionar(invitacion_id));

-- mensajes (libro de firmas)
create policy mensajes_leer on public.mensajes
  for select to anon, authenticated using (
    (visible and public.invitacion_publicada(invitacion_id))
    or ((select auth.uid()) is not null and public.puede_gestionar(invitacion_id))
  );
create policy mensajes_crear on public.mensajes
  for insert to anon, authenticated with check (public.invitacion_publicada(invitacion_id));
create policy mensajes_moderar on public.mensajes
  for update to authenticated using (public.puede_gestionar(invitacion_id)) with check (public.puede_gestionar(invitacion_id));
create policy mensajes_borrar on public.mensajes
  for delete to authenticated using (public.puede_gestionar(invitacion_id));

-- confirmaciones (RSVP)
create policy confirmaciones_crear on public.confirmaciones
  for insert to anon, authenticated with check (public.invitacion_publicada(invitacion_id));
create policy confirmaciones_leer on public.confirmaciones
  for select to authenticated using (public.puede_gestionar(invitacion_id));
create policy confirmaciones_borrar on public.confirmaciones
  for delete to authenticated using (public.puede_gestionar(invitacion_id));

-- ---------------------------------------------------------------------
-- REALTIME: el libro de firmas se actualiza en vivo en la landing
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.mensajes;

-- ---------------------------------------------------------------------
-- DATOS INICIALES
-- ---------------------------------------------------------------------
insert into public.colegios (nombre, ciudad, fundacion, lema, color_primario, color_secundario)
values ('Unidad Educativa Monte Cristo', 'Sucre – Bolivia', 2008,
        '“Unidos por la fe, formados para servir”', '#d2161e', '#121212');
