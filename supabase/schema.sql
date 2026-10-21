-- =====================================================================
-- POSTECH — Base de datos (Supabase / PostgreSQL 15+)
-- Talleres y almacenes de repuestos de motos
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO este
-- archivo → Run. Se puede volver a ejecutar sin romper nada, pero no
-- modifica tablas que ya existan (para empezar de cero, borra el
-- esquema "public" desde el panel o crea un proyecto nuevo).
--
-- Modelo: un negocio tiene varios usuarios (perfiles) con rol
--   dueno | admin | cajero | mecanico
-- y todos los datos están aislados por negocio con RLS.
-- Reglas clave:
--   * El stock solo cambia a través de movimientos_inventario.
--   * Ventas, anulaciones, entregas de orden, recepción de compras y
--     ajustes de stock se hacen con funciones (RPC), no con INSERT directo.
--   * Los precios incluyen IVA; "impuesto" es informativo.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'rol_usuario') then
    create type public.rol_usuario as enum ('dueno', 'admin', 'cajero', 'mecanico');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'estado_orden') then
    create type public.estado_orden as enum ('recibida', 'diagnostico', 'reparacion', 'lista', 'entregada', 'cancelada');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'metodo_pago') then
    create type public.metodo_pago as enum ('efectivo', 'tarjeta', 'transferencia', 'credito');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'estado_venta') then
    create type public.estado_venta as enum ('completada', 'anulada');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'estado_compra') then
    create type public.estado_compra as enum ('pendiente', 'recibida', 'cancelada');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'tipo_movimiento') then
    create type public.tipo_movimiento as enum ('inicial', 'compra', 'venta', 'ajuste', 'anulacion');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'tipo_item_orden') then
    create type public.tipo_item_orden as enum ('repuesto', 'mano_obra');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Negocios y perfiles (equipo)
-- ---------------------------------------------------------------------
create table if not exists public.negocios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  nit         text,
  telefono    text,
  direccion   text,
  ciudad      text,
  creado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Datos del comprobante (cada negocio los configura desde Configuración)
alter table public.negocios add column if not exists razon_social     text;
alter table public.negocios add column if not exists regimen          text;
alter table public.negocios add column if not exists email            text;
alter table public.negocios add column if not exists logo_url         text;
alter table public.negocios add column if not exists pie_comprobante  text;

create table if not exists public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  negocio_id       uuid not null references public.negocios (id) on delete cascade,
  nombre_completo  text not null default '',
  telefono         text,
  rol              public.rol_usuario not null default 'cajero',
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists perfiles_negocio_idx on public.perfiles (negocio_id);

-- Quién soy yo (usadas por las políticas RLS y por los valores por defecto)
create or replace function public.mi_negocio_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select negocio_id from public.perfiles where id = (select auth.uid()) and activo
$$;

create or replace function public.mi_rol()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$
  select rol from public.perfiles where id = (select auth.uid()) and activo
$$;

create or replace function public.tiene_rol(variadic roles public.rol_usuario[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.mi_rol() = any (roles), false)
$$;

-- ---------------------------------------------------------------------
-- 3. Catálogo: categorías, modelos de moto, proveedores, productos
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  created_at  timestamptz not null default now(),
  unique (id, negocio_id)
);
create unique index if not exists categorias_nombre_uk on public.categorias (negocio_id, lower(nombre));

create table if not exists public.modelos_moto (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  marca       text not null check (length(trim(marca)) > 0),
  modelo      text not null check (length(trim(modelo)) > 0),
  cilindraje  integer check (cilindraje is null or cilindraje > 0),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (id, negocio_id)
);
create unique index if not exists modelos_moto_uk on public.modelos_moto (negocio_id, lower(marca), lower(modelo));

create table if not exists public.proveedores (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  nit         text,
  contacto    text,
  telefono    text,
  email       text,
  direccion   text,
  notas       text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, negocio_id)
);
create index if not exists proveedores_negocio_idx on public.proveedores (negocio_id);

create table if not exists public.productos (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  categoria_id    uuid,
  proveedor_id    uuid,
  sku             text not null check (length(trim(sku)) > 0),   -- referencia / código interno
  codigo_barras   text,
  nombre          text not null check (length(trim(nombre)) > 0),
  descripcion     text,
  marca           text,
  unidad          text not null default 'und',
  es_servicio     boolean not null default false,                 -- mano de obra: no maneja stock
  precio_costo    numeric(14,2) not null default 0 check (precio_costo >= 0),
  precio_venta    numeric(14,2) not null default 0 check (precio_venta >= 0),
  iva_porcentaje  numeric(5,2) not null default 0 check (iva_porcentaje between 0 and 100),
  stock_actual    numeric(14,3) not null default 0,
  stock_minimo    numeric(14,3) not null default 0 check (stock_minimo >= 0),
  ubicacion       text,                                           -- estante / bodega
  imagen_url      text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, negocio_id),
  unique (negocio_id, sku),
  check (not es_servicio or stock_actual = 0),
  foreign key (categoria_id, negocio_id) references public.categorias (id, negocio_id),
  foreign key (proveedor_id, negocio_id) references public.proveedores (id, negocio_id)
);
create unique index if not exists productos_barras_uk on public.productos (negocio_id, codigo_barras) where codigo_barras is not null;
create index if not exists productos_categoria_idx on public.productos (negocio_id, categoria_id);
create index if not exists productos_nombre_trgm on public.productos using gin (nombre extensions.gin_trgm_ops);
create index if not exists productos_sku_trgm on public.productos using gin (sku extensions.gin_trgm_ops);

-- Compatibilidad repuesto <-> modelo de moto
create table if not exists public.producto_compatibilidad (
  producto_id  uuid not null,
  modelo_id    uuid not null,
  negocio_id   uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  primary key (producto_id, modelo_id),
  foreign key (producto_id, negocio_id) references public.productos (id, negocio_id) on delete cascade,
  foreign key (modelo_id, negocio_id) references public.modelos_moto (id, negocio_id) on delete cascade
);
create index if not exists compat_modelo_idx on public.producto_compatibilidad (negocio_id, modelo_id);

-- ---------------------------------------------------------------------
-- 4. Clientes y motos
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  nombre          text not null check (length(trim(nombre)) > 0),
  tipo_documento  text default 'CC',
  documento       text,
  telefono        text,
  email           text,
  direccion       text,
  notas           text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, negocio_id)
);
create unique index if not exists clientes_documento_uk on public.clientes (negocio_id, documento) where documento is not null;
create index if not exists clientes_nombre_trgm on public.clientes using gin (nombre extensions.gin_trgm_ops);

create table if not exists public.motos (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  cliente_id     uuid,
  modelo_id      uuid,
  placa          text not null check (length(trim(placa)) > 0),
  color          text,
  anio           integer check (anio is null or anio between 1950 and 2100),
  kilometraje    integer check (kilometraje is null or kilometraje >= 0),
  numero_chasis  text,
  notas          text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, negocio_id),
  unique (negocio_id, placa),
  foreign key (cliente_id, negocio_id) references public.clientes (id, negocio_id),
  foreign key (modelo_id, negocio_id) references public.modelos_moto (id, negocio_id)
);
create index if not exists motos_cliente_idx on public.motos (negocio_id, cliente_id);

-- La placa se guarda en mayúsculas y sin espacios ni guiones: "kjh 47f" -> "KJH47F"
create or replace function public.normalizar_placa()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.placa := upper(regexp_replace(new.placa, '[\s\-]', '', 'g'));
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 5. Numeración por negocio (ventas, órdenes, compras)
-- ---------------------------------------------------------------------
create table if not exists public.negocio_consecutivos (
  negocio_id  uuid not null references public.negocios (id) on delete cascade,
  tipo        text not null,
  ultimo      bigint not null default 0,
  primary key (negocio_id, tipo)
);

create or replace function public.siguiente_consecutivo(p_negocio uuid, p_tipo text)
returns bigint
language sql security definer set search_path = ''
as $$
  insert into public.negocio_consecutivos (negocio_id, tipo, ultimo)
  values (p_negocio, p_tipo, 1)
  on conflict (negocio_id, tipo)
  do update set ultimo = public.negocio_consecutivos.ultimo + 1
  returning ultimo
$$;

create or replace function public.asignar_numero()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.numero is null then
    new.numero := public.siguiente_consecutivo(new.negocio_id, tg_argv[0]);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 6. Ventas
-- ---------------------------------------------------------------------
create table if not exists public.ventas (
  id                 uuid primary key default gen_random_uuid(),
  negocio_id         uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  numero             bigint,
  cliente_id         uuid,
  vendedor_id        uuid references public.perfiles (id) on delete set null,
  estado             public.estado_venta not null default 'completada',
  metodo_pago        public.metodo_pago not null default 'efectivo',
  subtotal           numeric(14,2) not null default 0,
  descuento          numeric(14,2) not null default 0 check (descuento >= 0),
  impuesto           numeric(14,2) not null default 0,
  total              numeric(14,2) not null default 0,
  pagado             numeric(14,2) not null default 0,
  notas              text,
  anulada_en         timestamptz,
  anulada_por        uuid references public.perfiles (id) on delete set null,
  motivo_anulacion   text,
  created_at         timestamptz not null default now(),
  unique (id, negocio_id),
  unique (negocio_id, numero),
  foreign key (cliente_id, negocio_id) references public.clientes (id, negocio_id)
);
create index if not exists ventas_fecha_idx on public.ventas (negocio_id, created_at desc);
create index if not exists ventas_cliente_idx on public.ventas (negocio_id, cliente_id);

create table if not exists public.venta_items (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  venta_id         uuid not null,
  producto_id      uuid,
  descripcion      text not null,
  cantidad         numeric(14,3) not null check (cantidad > 0),
  precio_unitario  numeric(14,2) not null check (precio_unitario >= 0),
  descuento        numeric(14,2) not null default 0 check (descuento >= 0),
  iva_porcentaje   numeric(5,2) not null default 0,
  costo_unitario   numeric(14,2) not null default 0,
  total            numeric(14,2) generated always as (round(cantidad * precio_unitario - descuento, 2)) stored,
  foreign key (venta_id, negocio_id) references public.ventas (id, negocio_id) on delete cascade,
  foreign key (producto_id, negocio_id) references public.productos (id, negocio_id)
);
-- Orden de captura de las líneas (el comprobante las muestra como se vendieron)
alter table public.venta_items add column if not exists linea bigint generated always as identity;
create index if not exists venta_items_venta_idx on public.venta_items (venta_id);
create index if not exists venta_items_producto_idx on public.venta_items (negocio_id, producto_id);

-- ---------------------------------------------------------------------
-- 7. Taller: órdenes de trabajo
-- ---------------------------------------------------------------------
create table if not exists public.ordenes_taller (
  id                   uuid primary key default gen_random_uuid(),
  negocio_id           uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  numero               bigint,
  moto_id              uuid not null,
  cliente_id           uuid,
  mecanico_id          uuid references public.perfiles (id) on delete set null,
  estado               public.estado_orden not null default 'recibida',
  problema_reportado   text not null check (length(trim(problema_reportado)) > 0),
  diagnostico          text,
  trabajo_realizado    text,
  kilometraje_entrada  integer check (kilometraje_entrada is null or kilometraje_entrada >= 0),
  fecha_ingreso        timestamptz not null default now(),
  fecha_estimada       date,
  fecha_entrega        timestamptz,
  total_estimado       numeric(14,2) not null default 0,
  venta_id             uuid,
  notas                text,
  creado_por           uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, negocio_id),
  unique (negocio_id, numero),
  foreign key (moto_id, negocio_id) references public.motos (id, negocio_id),
  foreign key (cliente_id, negocio_id) references public.clientes (id, negocio_id),
  foreign key (venta_id, negocio_id) references public.ventas (id, negocio_id)
);
create index if not exists ordenes_estado_idx on public.ordenes_taller (negocio_id, estado, fecha_ingreso desc);
create index if not exists ordenes_moto_idx on public.ordenes_taller (negocio_id, moto_id);
create index if not exists ordenes_mecanico_idx on public.ordenes_taller (negocio_id, mecanico_id);

create table if not exists public.orden_items (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  orden_id         uuid not null,
  tipo             public.tipo_item_orden not null default 'repuesto',
  producto_id      uuid,
  descripcion      text not null check (length(trim(descripcion)) > 0),
  cantidad         numeric(14,3) not null default 1 check (cantidad > 0),
  precio_unitario  numeric(14,2) not null default 0 check (precio_unitario >= 0),
  descuento        numeric(14,2) not null default 0 check (descuento >= 0),
  iva_porcentaje   numeric(5,2) not null default 0,
  total            numeric(14,2) generated always as (round(cantidad * precio_unitario - descuento, 2)) stored,
  created_at       timestamptz not null default now(),
  foreign key (orden_id, negocio_id) references public.ordenes_taller (id, negocio_id) on delete cascade,
  foreign key (producto_id, negocio_id) references public.productos (id, negocio_id)
);
create index if not exists orden_items_orden_idx on public.orden_items (orden_id);

-- ---------------------------------------------------------------------
-- 8. Compras a proveedores
-- ---------------------------------------------------------------------
create table if not exists public.compras (
  id                  uuid primary key default gen_random_uuid(),
  negocio_id          uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  numero              bigint,
  proveedor_id        uuid,
  estado              public.estado_compra not null default 'pendiente',
  factura_proveedor   text,
  fecha               date not null default current_date,
  subtotal            numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,
  notas               text,
  creado_por          uuid default auth.uid() references public.perfiles (id) on delete set null,
  recibida_en         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, negocio_id),
  unique (negocio_id, numero),
  foreign key (proveedor_id, negocio_id) references public.proveedores (id, negocio_id)
);
create index if not exists compras_fecha_idx on public.compras (negocio_id, fecha desc);

create table if not exists public.compra_items (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  compra_id       uuid not null,
  producto_id     uuid not null,
  cantidad        numeric(14,3) not null check (cantidad > 0),
  costo_unitario  numeric(14,2) not null check (costo_unitario >= 0),
  total           numeric(14,2) generated always as (round(cantidad * costo_unitario, 2)) stored,
  foreign key (compra_id, negocio_id) references public.compras (id, negocio_id) on delete cascade,
  foreign key (producto_id, negocio_id) references public.productos (id, negocio_id)
);
create index if not exists compra_items_compra_idx on public.compra_items (compra_id);

-- ---------------------------------------------------------------------
-- 9. Inventario: movimientos (única vía para cambiar el stock)
-- ---------------------------------------------------------------------
create table if not exists public.movimientos_inventario (
  id                bigint generated always as identity primary key,
  negocio_id        uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  producto_id       uuid not null,
  tipo              public.tipo_movimiento not null,
  cantidad          numeric(14,3) not null,          -- con signo: + entra, - sale
  stock_resultante  numeric(14,3),
  referencia_tipo   text,                            -- 'venta' | 'compra' | 'ajuste' ...
  referencia_id     uuid,
  usuario_id        uuid,
  nota              text,
  created_at        timestamptz not null default now(),
  foreign key (producto_id, negocio_id) references public.productos (id, negocio_id)
);
create index if not exists movimientos_producto_idx on public.movimientos_inventario (negocio_id, producto_id, created_at desc);

-- ---------------------------------------------------------------------
-- 10. Invitaciones al equipo
-- ---------------------------------------------------------------------
create table if not exists public.invitaciones (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null default public.mi_negocio_id() references public.negocios (id) on delete cascade,
  email        text not null check (position('@' in email) > 1),
  rol          public.rol_usuario not null default 'cajero' check (rol <> 'dueno'),
  creado_por   uuid default auth.uid() references public.perfiles (id) on delete set null,
  aceptada_en  timestamptz,
  created_at   timestamptz not null default now()
);
create unique index if not exists invitaciones_pendiente_uk on public.invitaciones (negocio_id, lower(email)) where aceptada_en is null;
create index if not exists invitaciones_email_idx on public.invitaciones (lower(email)) where aceptada_en is null;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- updated_at
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['negocios', 'perfiles', 'proveedores', 'productos', 'clientes', 'motos', 'ordenes_taller', 'compras']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.tocar_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

drop trigger if exists motos_placa on public.motos;
create trigger motos_placa before insert or update of placa on public.motos
  for each row execute function public.normalizar_placa();

drop trigger if exists ventas_numero on public.ventas;
create trigger ventas_numero before insert on public.ventas
  for each row execute function public.asignar_numero('venta');

drop trigger if exists ordenes_numero on public.ordenes_taller;
create trigger ordenes_numero before insert on public.ordenes_taller
  for each row execute function public.asignar_numero('orden');

drop trigger if exists compras_numero on public.compras;
create trigger compras_numero before insert on public.compras
  for each row execute function public.asignar_numero('compra');

-- Perfiles: nadie cambia de negocio; solo el dueño cambia roles
create or replace function public.proteger_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.id <> old.id or new.negocio_id <> old.negocio_id then
    raise exception 'No se puede cambiar el negocio de un perfil';
  end if;

  -- Desde el panel de Supabase / service role (sin sesión) no se aplican estas reglas
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.rol is distinct from old.rol then
    if not public.tiene_rol('dueno') then
      raise exception 'Solo el dueño puede cambiar roles';
    end if;
    if old.id = (select auth.uid()) then
      raise exception 'No puedes cambiar tu propio rol';
    end if;
  end if;

  if new.activo is distinct from old.activo then
    if old.id = (select auth.uid()) and not new.activo then
      raise exception 'No puedes desactivarte a ti mismo';
    end if;
    if old.rol = 'dueno' and not public.tiene_rol('dueno') then
      raise exception 'Solo un dueño puede desactivar a otro dueño';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists perfiles_proteger on public.perfiles;
create trigger perfiles_proteger before update on public.perfiles
  for each row execute function public.proteger_perfil();

-- Stock: solo cambia mediante movimientos
create or replace function public.proteger_stock()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.stock_actual is distinct from old.stock_actual
     and coalesce(current_setting('postech.mov', true), '') <> '1' then
    raise exception 'El stock solo cambia mediante movimientos de inventario (usa ajustar_stock)';
  end if;
  return new;
end $$;

drop trigger if exists productos_proteger_stock on public.productos;
create trigger productos_proteger_stock before update of stock_actual on public.productos
  for each row execute function public.proteger_stock();

create or replace function public.aplicar_movimiento()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_stock  numeric(14,3);
  v_nombre text;
begin
  select stock_actual, nombre into v_stock, v_nombre
  from public.productos
  where id = new.producto_id and negocio_id = new.negocio_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  -- No se vende lo que no hay: la venta completa se cancela
  if new.tipo = 'venta' and v_stock + new.cantidad < 0 then
    raise exception 'Stock insuficiente de "%": quedan % y se piden %', v_nombre, v_stock, -new.cantidad
      using errcode = 'P0001';
  end if;

  if new.tipo = 'inicial' then
    -- Solo deja constancia del stock con el que nació el producto
    new.stock_resultante := v_stock;
  else
    new.stock_resultante := v_stock + new.cantidad;
    perform set_config('postech.mov', '1', true);
    update public.productos set stock_actual = new.stock_resultante where id = new.producto_id;
    perform set_config('postech.mov', '', true);
  end if;
  return new;
end $$;

drop trigger if exists movimientos_aplicar on public.movimientos_inventario;
create trigger movimientos_aplicar before insert on public.movimientos_inventario
  for each row execute function public.aplicar_movimiento();

-- Producto creado con stock inicial -> deja un movimiento 'inicial'
create or replace function public.registrar_stock_inicial()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.stock_actual <> 0 and not new.es_servicio then
    insert into public.movimientos_inventario (negocio_id, producto_id, tipo, cantidad, referencia_tipo, usuario_id, nota)
    values (new.negocio_id, new.id, 'inicial', new.stock_actual, 'producto', (select auth.uid()), 'Stock inicial');
  end if;
  return null;
end $$;

drop trigger if exists productos_stock_inicial on public.productos;
create trigger productos_stock_inicial after insert on public.productos
  for each row execute function public.registrar_stock_inicial();

-- Cada ítem vendido descuenta stock (los servicios no)
create or replace function public.descontar_stock_venta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_servicio boolean;
begin
  if new.producto_id is not null then
    select es_servicio into v_servicio from public.productos where id = new.producto_id;
    if not coalesce(v_servicio, false) then
      insert into public.movimientos_inventario
        (negocio_id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id)
      values
        (new.negocio_id, new.producto_id, 'venta', -new.cantidad, 'venta', new.venta_id, (select auth.uid()));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists venta_items_stock on public.venta_items;
create trigger venta_items_stock after insert on public.venta_items
  for each row execute function public.descontar_stock_venta();

-- Total estimado de la orden = suma de sus ítems
create or replace function public.recalcular_orden()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_orden uuid := coalesce(new.orden_id, old.orden_id);
begin
  update public.ordenes_taller
  set total_estimado = coalesce((select sum(total) from public.orden_items where orden_id = v_orden), 0)
  where id = v_orden;
  return null;
end $$;

drop trigger if exists orden_items_total on public.orden_items;
create trigger orden_items_total after insert or update or delete on public.orden_items
  for each row execute function public.recalcular_orden();

-- Una orden entregada o cancelada ya no admite cambios en sus ítems
create or replace function public.bloquear_items_orden()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_estado public.estado_orden;
  v_orden uuid := coalesce(new.orden_id, old.orden_id);
begin
  select estado into v_estado from public.ordenes_taller where id = v_orden;
  if v_estado in ('entregada', 'cancelada') then
    raise exception 'La orden está % y no admite cambios en sus ítems', v_estado;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists orden_items_bloqueo on public.orden_items;
create trigger orden_items_bloqueo before insert or update or delete on public.orden_items
  for each row execute function public.bloquear_items_orden();

-- Estado "entregada" solo se alcanza con entregar_orden()
create or replace function public.proteger_orden()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if coalesce(current_setting('postech.orden', true), '') = '1' then
    return new;
  end if;
  if (select auth.uid()) is null then
    return new;   -- panel de Supabase / service role
  end if;
  if old.estado = 'entregada' then
    raise exception 'La orden ya fue entregada y no se puede modificar';
  end if;
  if new.estado = 'entregada' or new.venta_id is distinct from old.venta_id then
    raise exception 'Una orden se entrega con entregar_orden()';
  end if;
  return new;
end $$;

drop trigger if exists ordenes_proteger on public.ordenes_taller;
create trigger ordenes_proteger before update on public.ordenes_taller
  for each row execute function public.proteger_orden();

-- Total de la compra = suma de sus ítems
create or replace function public.recalcular_compra()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_compra uuid := coalesce(new.compra_id, old.compra_id);
begin
  update public.compras c
  set subtotal = coalesce((select sum(total) from public.compra_items where compra_id = v_compra), 0),
      total    = coalesce((select sum(total) from public.compra_items where compra_id = v_compra), 0)
  where c.id = v_compra;
  return null;
end $$;

drop trigger if exists compra_items_total on public.compra_items;
create trigger compra_items_total after insert or update or delete on public.compra_items
  for each row execute function public.recalcular_compra();

create or replace function public.bloquear_items_compra()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_estado public.estado_compra;
  v_compra uuid := coalesce(new.compra_id, old.compra_id);
begin
  select estado into v_estado from public.compras where id = v_compra;
  if v_estado is distinct from 'pendiente' then
    raise exception 'La compra está % y no admite cambios en sus ítems', v_estado;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists compra_items_bloqueo on public.compra_items;
create trigger compra_items_bloqueo before insert or update or delete on public.compra_items
  for each row execute function public.bloquear_items_compra();

-- =====================================================================
-- ALTA DE USUARIOS: crea el negocio (o une al equipo si fue invitado)
-- =====================================================================
create or replace function public.sembrar_negocio(p_negocio uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.categorias (negocio_id, nombre)
  select p_negocio, c from unnest(array[
    'Motor', 'Frenos', 'Transmisión y kit de arrastre', 'Sistema eléctrico', 'Lubricantes y aceites',
    'Filtros', 'Llantas y rines', 'Suspensión', 'Carrocería y plásticos', 'Accesorios', 'Mano de obra'
  ]) as c
  on conflict do nothing;

  -- Catálogo inicial editable (puedes agregar, cambiar o desactivar modelos)
  insert into public.modelos_moto (negocio_id, marca, modelo, cilindraje)
  select p_negocio, m.marca, m.modelo, m.cc
  from (values
    ('AKT',     'NKD 125',        125),
    ('AKT',     'TT 125',         125),
    ('Bajaj',   'Boxer CT 100',   100),
    ('Bajaj',   'Pulsar NS 160',  160),
    ('Bajaj',   'Pulsar NS 200',  200),
    ('Honda',   'CB 125F',        125),
    ('Honda',   'CB 190R',        190),
    ('Honda',   'XR 150L',        150),
    ('Yamaha',  'FZ 2.0',         150),
    ('Yamaha',  'XTZ 125',        125),
    ('Yamaha',  'YBR 125',        125),
    ('Suzuki',  'Gixxer 150',     150),
    ('Suzuki',  'GN 125',         125),
    ('TVS',     'Apache RTR 160', 160),
    ('Kawasaki','Ninja 400',      400)
  ) as m(marca, modelo, cc)
  on conflict do nothing;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv      public.invitaciones%rowtype;
  v_negocio  uuid;
  v_nombre   text;
begin
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  -- ¿Tiene una invitación pendiente? Entra al equipo de ese negocio.
  select * into v_inv
  from public.invitaciones
  where lower(email) = lower(coalesce(new.email, '')) and aceptada_en is null
  order by created_at desc
  limit 1;

  if found then
    insert into public.perfiles (id, negocio_id, nombre_completo, rol)
    values (new.id, v_inv.negocio_id, v_nombre, v_inv.rol);
    update public.invitaciones set aceptada_en = now() where id = v_inv.id;
  else
    insert into public.negocios (nombre, creado_por)
    values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''), 'Mi negocio'), new.id)
    returning id into v_negocio;

    insert into public.perfiles (id, negocio_id, nombre_completo, rol)
    values (new.id, v_negocio, v_nombre, 'dueno');

    perform public.sembrar_negocio(v_negocio);
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- FUNCIONES (RPC) para operaciones de varios pasos
-- =====================================================================

-- Interna: crea la venta, sus ítems (descuentan stock) y calcula totales.
-- p_items: [{producto_id?, descripcion?, cantidad, precio_unitario?, descuento?, iva_porcentaje?}]
create or replace function public._insertar_venta(
  p_neg        uuid,
  p_cliente    uuid,
  p_metodo     public.metodo_pago,
  p_descuento  numeric,
  p_notas      text,
  p_pagado     numeric,
  p_items      jsonb
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id        uuid;
  v_item      jsonb;
  v_prod      public.productos%rowtype;
  v_prod_id   uuid;
  v_descr     text;
  v_cant      numeric;
  v_precio    numeric;
  v_desc      numeric;
  v_iva       numeric;
  v_costo     numeric;
  v_linea     numeric;
  v_subtotal  numeric := 0;
  v_impuesto  numeric := 0;
  v_total     numeric;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un ítem';
  end if;
  if p_cliente is not null
     and not exists (select 1 from public.clientes where id = p_cliente and negocio_id = p_neg) then
    raise exception 'Cliente no válido';
  end if;
  if p_metodo = 'credito' and p_cliente is null then
    raise exception 'Una venta a crédito requiere un cliente';
  end if;

  insert into public.ventas (negocio_id, cliente_id, vendedor_id, metodo_pago, notas)
  values (p_neg, p_cliente, (select auth.uid()), p_metodo, p_notas)
  returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_prod_id := nullif(v_item ->> 'producto_id', '')::uuid;
    v_cant    := (v_item ->> 'cantidad')::numeric;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad inválida en un ítem';
    end if;

    if v_prod_id is not null then
      select * into v_prod
      from public.productos
      where id = v_prod_id and negocio_id = p_neg and activo;
      if not found then
        raise exception 'Producto no válido o inactivo';
      end if;
      v_descr  := coalesce(nullif(v_item ->> 'descripcion', ''), v_prod.nombre);
      v_precio := coalesce((v_item ->> 'precio_unitario')::numeric, v_prod.precio_venta);
      v_iva    := coalesce((v_item ->> 'iva_porcentaje')::numeric, v_prod.iva_porcentaje);
      v_costo  := v_prod.precio_costo;
    else
      v_descr := nullif(v_item ->> 'descripcion', '');
      if v_descr is null or (v_item ->> 'precio_unitario') is null then
        raise exception 'Un ítem sin producto necesita descripción y precio';
      end if;
      v_precio := (v_item ->> 'precio_unitario')::numeric;
      v_iva    := coalesce((v_item ->> 'iva_porcentaje')::numeric, 0);
      v_costo  := 0;
    end if;

    v_desc  := coalesce((v_item ->> 'descuento')::numeric, 0);
    v_linea := round(v_cant * v_precio - v_desc, 2);
    if v_linea < 0 then
      raise exception 'El descuento de un ítem supera su valor';
    end if;

    insert into public.venta_items
      (negocio_id, venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, iva_porcentaje, costo_unitario)
    values
      (p_neg, v_id, v_prod_id, v_descr, v_cant, v_precio, v_desc, v_iva, v_costo);

    v_subtotal := v_subtotal + v_linea;
    v_impuesto := v_impuesto + (v_linea - v_linea / (1 + v_iva / 100));
  end loop;

  p_descuento := coalesce(p_descuento, 0);
  if p_descuento < 0 or p_descuento > v_subtotal then
    raise exception 'Descuento inválido';
  end if;
  v_total := v_subtotal - p_descuento;
  if v_subtotal > 0 then
    v_impuesto := v_impuesto * (v_total / v_subtotal);   -- el impuesto sigue el descuento global
  end if;

  update public.ventas
  set subtotal  = round(v_subtotal, 2),
      descuento = round(p_descuento, 2),
      impuesto  = round(v_impuesto, 2),
      total     = round(v_total, 2),
      pagado    = case when p_metodo = 'credito'
                       then least(round(coalesce(p_pagado, 0), 2), round(v_total, 2))
                       else round(v_total, 2) end
  where id = v_id;

  return v_id;
end $$;

-- Venta de mostrador
create or replace function public.registrar_venta(
  p_items      jsonb,
  p_metodo     public.metodo_pago default 'efectivo',
  p_cliente    uuid default null,
  p_descuento  numeric default 0,
  p_notas      text default null,
  p_pagado     numeric default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.tiene_rol('dueno', 'admin', 'cajero') then
    raise exception 'No tienes permiso para registrar ventas' using errcode = '42501';
  end if;
  return public._insertar_venta(public.mi_negocio_id(), p_cliente, p_metodo, p_descuento, p_notas, p_pagado, p_items);
end $$;

-- Anular una venta: devuelve el stock y reabre la orden de taller si venía de una
create or replace function public.anular_venta(p_venta uuid, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_neg    uuid := public.mi_negocio_id();
  v_venta  public.ventas%rowtype;
  v_item   record;
begin
  if not public.tiene_rol('dueno', 'admin') then
    raise exception 'Solo el dueño o un administrador pueden anular ventas' using errcode = '42501';
  end if;

  select * into v_venta from public.ventas where id = p_venta and negocio_id = v_neg for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if v_venta.estado = 'anulada' then
    raise exception 'La venta ya está anulada';
  end if;

  update public.ventas
  set estado = 'anulada', anulada_en = now(), anulada_por = (select auth.uid()), motivo_anulacion = p_motivo
  where id = p_venta;

  for v_item in
    select vi.producto_id, vi.cantidad
    from public.venta_items vi
    join public.productos p on p.id = vi.producto_id
    where vi.venta_id = p_venta and not p.es_servicio
  loop
    insert into public.movimientos_inventario
      (negocio_id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, nota)
    values
      (v_neg, v_item.producto_id, 'anulacion', v_item.cantidad, 'venta', p_venta, (select auth.uid()), p_motivo);
  end loop;

  perform set_config('postech.orden', '1', true);
  update public.ordenes_taller
  set estado = 'lista', venta_id = null, fecha_entrega = null
  where venta_id = p_venta and negocio_id = v_neg;
  perform set_config('postech.orden', '', true);
end $$;

-- Entregar una orden de taller: genera la venta con sus repuestos y mano de obra
create or replace function public.entregar_orden(
  p_orden   uuid,
  p_metodo  public.metodo_pago default 'efectivo',
  p_notas   text default null,
  p_pagado  numeric default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_neg      uuid := public.mi_negocio_id();
  v_orden    public.ordenes_taller%rowtype;
  v_cliente  uuid;
  v_items    jsonb;
  v_venta    uuid;
begin
  if not public.tiene_rol('dueno', 'admin', 'cajero') then
    raise exception 'No tienes permiso para entregar órdenes' using errcode = '42501';
  end if;

  select * into v_orden from public.ordenes_taller where id = p_orden and negocio_id = v_neg for update;
  if not found then
    raise exception 'Orden no encontrada';
  end if;
  if v_orden.estado <> 'lista' then
    raise exception 'Solo se puede entregar una orden en estado "lista" (actual: %)', v_orden.estado;
  end if;

  select coalesce(v_orden.cliente_id, m.cliente_id) into v_cliente
  from public.motos m where m.id = v_orden.moto_id and m.negocio_id = v_neg;

  select jsonb_agg(jsonb_build_object(
           'producto_id', producto_id,
           'descripcion', descripcion,
           'cantidad', cantidad,
           'precio_unitario', precio_unitario,
           'descuento', descuento,
           'iva_porcentaje', iva_porcentaje))
  into v_items
  from public.orden_items
  where orden_id = p_orden;

  if v_items is null then
    raise exception 'La orden no tiene ítems para facturar';
  end if;

  v_venta := public._insertar_venta(
    v_neg, v_cliente, p_metodo, 0,
    coalesce(p_notas, 'Orden de taller #' || v_orden.numero), p_pagado, v_items);

  perform set_config('postech.orden', '1', true);
  update public.ordenes_taller
  set estado = 'entregada', fecha_entrega = now(), venta_id = v_venta
  where id = p_orden;
  perform set_config('postech.orden', '', true);

  return v_venta;
end $$;

-- Recibir una compra: entra el stock y se actualiza el costo de cada producto
create or replace function public.recibir_compra(p_compra uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_neg     uuid := public.mi_negocio_id();
  v_compra  public.compras%rowtype;
  v_item    record;
  v_hay     boolean := false;
begin
  if not public.tiene_rol('dueno', 'admin') then
    raise exception 'Solo el dueño o un administrador pueden recibir compras' using errcode = '42501';
  end if;

  select * into v_compra from public.compras where id = p_compra and negocio_id = v_neg for update;
  if not found then
    raise exception 'Compra no encontrada';
  end if;
  if v_compra.estado <> 'pendiente' then
    raise exception 'La compra ya está %', v_compra.estado;
  end if;

  for v_item in
    select ci.producto_id, ci.cantidad, ci.costo_unitario, p.es_servicio
    from public.compra_items ci
    join public.productos p on p.id = ci.producto_id
    where ci.compra_id = p_compra
  loop
    v_hay := true;
    if not v_item.es_servicio then
      insert into public.movimientos_inventario
        (negocio_id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id)
      values
        (v_neg, v_item.producto_id, 'compra', v_item.cantidad, 'compra', p_compra, (select auth.uid()));
    end if;
    update public.productos set precio_costo = v_item.costo_unitario where id = v_item.producto_id;
  end loop;

  if not v_hay then
    raise exception 'La compra no tiene ítems';
  end if;

  update public.compras set estado = 'recibida', recibida_en = now() where id = p_compra;
end $$;

-- Ajuste manual de inventario (conteo físico): se indica el stock real
create or replace function public.ajustar_stock(p_producto uuid, p_stock_real numeric, p_nota text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_neg   uuid := public.mi_negocio_id();
  v_prod  public.productos%rowtype;
  v_dif   numeric;
begin
  if not public.tiene_rol('dueno', 'admin') then
    raise exception 'Solo el dueño o un administrador pueden ajustar el inventario' using errcode = '42501';
  end if;

  select * into v_prod from public.productos where id = p_producto and negocio_id = v_neg;
  if not found then
    raise exception 'Producto no encontrado';
  end if;
  if v_prod.es_servicio then
    raise exception 'Un servicio no maneja stock';
  end if;

  v_dif := p_stock_real - v_prod.stock_actual;
  if v_dif = 0 then
    return;
  end if;

  insert into public.movimientos_inventario
    (negocio_id, producto_id, tipo, cantidad, referencia_tipo, usuario_id, nota)
  values
    (v_neg, p_producto, 'ajuste', v_dif, 'ajuste', (select auth.uid()), p_nota);
end $$;

-- Búsqueda rápida para el mostrador: por nombre, referencia o código de barras,
-- y opcionalmente solo repuestos compatibles con un modelo de moto.
create or replace function public.buscar_productos(
  p_texto   text default null,
  p_modelo  uuid default null,
  p_limite  integer default 30
)
returns setof public.productos
language sql stable security invoker set search_path = ''
as $$
  select p.*
  from public.productos p
  where p.activo
    and (
      coalesce(trim(p_texto), '') = ''
      or p.nombre ilike '%' || trim(p_texto) || '%'
      or p.sku ilike '%' || trim(p_texto) || '%'
      or p.codigo_barras = trim(p_texto)
    )
    and (
      p_modelo is null
      or exists (
        select 1 from public.producto_compatibilidad c
        where c.producto_id = p.id and c.modelo_id = p_modelo
      )
    )
  order by (lower(p.sku) = lower(coalesce(trim(p_texto), '')) or p.codigo_barras = trim(p_texto)) desc, p.nombre
  limit least(greatest(coalesce(p_limite, 30), 1), 100)
$$;

-- Productos por debajo del mínimo
create or replace view public.v_stock_bajo with (security_invoker = true) as
  select id, negocio_id, sku, nombre, stock_actual, stock_minimo, ubicacion
  from public.productos
  where activo and not es_servicio and stock_actual <= stock_minimo;

-- =====================================================================
-- SEGURIDAD: RLS por negocio y por rol
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'negocios', 'perfiles', 'categorias', 'modelos_moto', 'proveedores', 'productos',
    'producto_compatibilidad', 'clientes', 'motos', 'ventas', 'venta_items',
    'ordenes_taller', 'orden_items', 'compras', 'compra_items',
    'movimientos_inventario', 'invitaciones', 'negocio_consecutivos'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- negocios
drop policy if exists negocios_select on public.negocios;
create policy negocios_select on public.negocios for select to authenticated
  using (id = (select public.mi_negocio_id()));
drop policy if exists negocios_update on public.negocios;
create policy negocios_update on public.negocios for update to authenticated
  using (id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))
  with check (id = (select public.mi_negocio_id()));

-- perfiles (alta solo por el trigger de registro)
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles for select to authenticated
  using (negocio_id = (select public.mi_negocio_id()));
drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles for update to authenticated
  using (negocio_id = (select public.mi_negocio_id())
         and (id = (select auth.uid()) or public.tiene_rol('dueno', 'admin')))
  with check (negocio_id = (select public.mi_negocio_id()));

-- invitaciones
drop policy if exists invitaciones_all on public.invitaciones;
create policy invitaciones_all on public.invitaciones for all to authenticated
  using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))
  with check (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'));

-- Catálogo: todos leen; dueño y admin escriben
do $$
declare t text;
begin
  foreach t in array array['categorias', 'modelos_moto', 'proveedores', 'productos', 'producto_compatibilidad']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format($p$create policy %I on public.%I for select to authenticated
                      using (negocio_id = (select public.mi_negocio_id()))$p$, t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format($p$create policy %I on public.%I for all to authenticated
                      using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))
                      with check (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))$p$,
                   t || '_write', t);
  end loop;
end $$;

-- Clientes y motos: todos leen; todos crean/editan; solo dueño/admin borran
do $$
declare t text;
begin
  foreach t in array array['clientes', 'motos']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format($p$create policy %I on public.%I for select to authenticated
                      using (negocio_id = (select public.mi_negocio_id()))$p$, t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
                      with check (negocio_id = (select public.mi_negocio_id()))$p$, t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format($p$create policy %I on public.%I for update to authenticated
                      using (negocio_id = (select public.mi_negocio_id()))
                      with check (negocio_id = (select public.mi_negocio_id()))$p$, t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
                      using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))$p$,
                   t || '_delete', t);
  end loop;
end $$;

-- Ventas, ítems y movimientos: solo lectura (se escriben con las funciones)
drop policy if exists ventas_select on public.ventas;
create policy ventas_select on public.ventas for select to authenticated
  using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin', 'cajero'));

drop policy if exists venta_items_select on public.venta_items;
create policy venta_items_select on public.venta_items for select to authenticated
  using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin', 'cajero'));

drop policy if exists movimientos_select on public.movimientos_inventario;
create policy movimientos_select on public.movimientos_inventario for select to authenticated
  using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin', 'cajero'));

-- Órdenes de taller: el mecánico solo ve y edita las suyas
drop policy if exists ordenes_select on public.ordenes_taller;
create policy ordenes_select on public.ordenes_taller for select to authenticated
  using (negocio_id = (select public.mi_negocio_id())
         and (public.tiene_rol('dueno', 'admin', 'cajero')
              or (public.tiene_rol('mecanico') and mecanico_id = (select auth.uid()))));

drop policy if exists ordenes_insert on public.ordenes_taller;
create policy ordenes_insert on public.ordenes_taller for insert to authenticated
  with check (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin', 'cajero'));

drop policy if exists ordenes_update on public.ordenes_taller;
create policy ordenes_update on public.ordenes_taller for update to authenticated
  using (negocio_id = (select public.mi_negocio_id())
         and (public.tiene_rol('dueno', 'admin', 'cajero')
              or (public.tiene_rol('mecanico') and mecanico_id = (select auth.uid()))))
  with check (negocio_id = (select public.mi_negocio_id())
         and (public.tiene_rol('dueno', 'admin', 'cajero')
              or (public.tiene_rol('mecanico') and mecanico_id = (select auth.uid()))));

drop policy if exists ordenes_delete on public.ordenes_taller;
create policy ordenes_delete on public.ordenes_taller for delete to authenticated
  using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin') and estado <> 'entregada');

-- Ítems de orden: siguen la visibilidad de su orden
drop policy if exists orden_items_all on public.orden_items;
create policy orden_items_all on public.orden_items for all to authenticated
  using (negocio_id = (select public.mi_negocio_id())
         and exists (select 1 from public.ordenes_taller o where o.id = orden_items.orden_id))
  with check (negocio_id = (select public.mi_negocio_id())
         and exists (select 1 from public.ordenes_taller o where o.id = orden_items.orden_id));

-- Compras: solo dueño y admin
do $$
declare t text;
begin
  foreach t in array array['compras', 'compra_items']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format($p$create policy %I on public.%I for all to authenticated
                      using (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))
                      with check (negocio_id = (select public.mi_negocio_id()) and public.tiene_rol('dueno', 'admin'))$p$,
                   t || '_all', t);
  end loop;
end $$;

-- =====================================================================
-- PERMISOS: nada para anónimos; solo lo necesario para usuarios con sesión
-- =====================================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on public.negocio_consecutivos from authenticated;
-- Los usuarios no insertan/borran directamente donde existen funciones o triggers
revoke insert, delete on public.negocios, public.perfiles from authenticated;
revoke insert, update, delete on public.ventas, public.venta_items, public.movimientos_inventario from authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.proname in ('mi_negocio_id', 'mi_rol', 'tiene_rol', 'registrar_venta', 'anular_venta',
                     'entregar_orden', 'recibir_compra', 'ajustar_stock', 'buscar_productos') then
      execute format('grant execute on function %s to authenticated', f.sig);
    else
      execute format('revoke all on function %s from authenticated', f.sig);
    end if;
  end loop;
end $$;

-- =====================================================================
-- LOGOS: bucket público "logos"; cada negocio solo escribe en su carpeta
-- (solo dueño y administrador). Se omite si el esquema storage no existe.
-- =====================================================================
do $$
begin
  if to_regclass('storage.objects') is not null and to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do update
      set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

    drop policy if exists logos_select on storage.objects;
    create policy logos_select on storage.objects for select to authenticated
      using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select public.mi_negocio_id())::text);

    drop policy if exists logos_insert on storage.objects;
    create policy logos_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'logos'
                  and (storage.foldername(name))[1] = (select public.mi_negocio_id())::text
                  and public.tiene_rol('dueno', 'admin'));

    drop policy if exists logos_update on storage.objects;
    create policy logos_update on storage.objects for update to authenticated
      using (bucket_id = 'logos'
             and (storage.foldername(name))[1] = (select public.mi_negocio_id())::text
             and public.tiene_rol('dueno', 'admin'))
      with check (bucket_id = 'logos'
                  and (storage.foldername(name))[1] = (select public.mi_negocio_id())::text);

    drop policy if exists logos_delete on storage.objects;
    create policy logos_delete on storage.objects for delete to authenticated
      using (bucket_id = 'logos'
             and (storage.foldername(name))[1] = (select public.mi_negocio_id())::text
             and public.tiene_rol('dueno', 'admin'));
  end if;
exception when others then
  -- Si Supabase no deja crear esto desde el SQL Editor, el resto del script sigue y no se cancela.
  -- En ese caso crea el bucket "logos" (público) desde Storage en el panel.
  raise notice 'No se pudo configurar el bucket de logos: %', sqlerrm;
end $$;

-- =====================================================================
-- Uso desde el front (supabase-js)
--   Venta:    supabase.rpc('registrar_venta', { p_items: [{ producto_id, cantidad }], p_metodo: 'efectivo' })
--   Entrega:  supabase.rpc('entregar_orden', { p_orden: id, p_metodo: 'efectivo' })
--   Compra:   supabase.rpc('recibir_compra', { p_compra: id })
--   Ajuste:   supabase.rpc('ajustar_stock', { p_producto: id, p_stock_real: 12 })
--   Buscar:   supabase.rpc('buscar_productos', { p_texto: 'kit', p_modelo: modeloId })
-- =====================================================================

-- Que la API (PostgREST) vea de inmediato las tablas y columnas nuevas
notify pgrst, 'reload schema';
