-- ============ ENUMS ============
create type public.app_role as enum ('administrador_general','administrador_comercial','administrador_financiero','administrador_tecnico','soporte','cliente_admin','usuario_cliente');
create type public.record_status as enum ('activo','inactivo','borrador','archivado');
create type public.invoice_status as enum ('borrador','emitida','enviada','pagada','parcial','vencida','anulada');
create type public.invoice_type as enum ('ordinaria','rectificativa','abono','nota_credito');
create type public.billing_period as enum ('mensual','trimestral','semestral','anual','puntual');
create type public.payment_status as enum ('pendiente','cobrado','devuelto','cancelado','impagado');
create type public.payment_method as enum ('transferencia','tarjeta','sepa','paypal','stripe','domiciliacion');
create type public.doc_type as enum ('contrato','factura','presupuesto','licencia','documentacion','imagen','email','otro');
create type public.ticket_status as enum ('abierto','en_progreso','pendiente','resuelto','cerrado');
create type public.ticket_priority as enum ('baja','media','alta','critica');
create type public.account_kind as enum ('activo','pasivo','patrimonio','ingreso','gasto');

-- ============ HELPERS ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES / ROLES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uuid uuid not null default gen_random_uuid(),
  nombre text, apellidos text, email text, telefono text,
  cargo text, departamento text, idioma text default 'es', zona_horaria text default 'Europe/Madrid',
  estado public.record_status not null default 'activo',
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_self_write" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_read" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'administrador_general')
  on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ CORE (integración módulos 1-7) ============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  uuid uuid not null default gen_random_uuid(),
  external_id text unique,
  razon_social text not null,
  nombre_comercial text,
  nif text,
  direccion text, provincia text, pais text default 'España',
  persona_contacto text, email text, telefono text, web text,
  sector text, num_empleados integer,
  estado public.record_status not null default 'activo',
  fecha_alta date default current_date, fecha_baja date,
  observaciones text, etiquetas text[] default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  uuid uuid not null default gen_random_uuid(),
  external_id text unique,
  nombre text not null, descripcion text, version text, categoria text, url text, proveedor text,
  modelo_cobro text, precio_base numeric(12,2) default 0, precio_usuario numeric(12,2) default 0,
  precio_uso numeric(12,4) default 0, logo_url text,
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);

-- ============ MÓDULO 8: FACTURACIÓN ============
create table public.invoice_series (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, descripcion text,
  prefijo text not null, proximo_numero integer not null default 1, ejercicio integer not null default extract(year from now()),
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, descripcion text,
  tipo text not null default 'porcentaje',
  valor numeric(12,2) not null default 0,
  valido_desde date, valido_hasta date, usos_maximos integer, usos_actuales integer not null default 0,
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  uuid uuid not null default gen_random_uuid(),
  numero text not null unique,
  serie_id uuid references public.invoice_series(id),
  client_id uuid references public.clients(id) on delete set null,
  tipo public.invoice_type not null default 'ordinaria',
  estado public.invoice_status not null default 'borrador',
  periodicidad public.billing_period not null default 'mensual',
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  periodo_desde date, periodo_hasta date,
  base_imponible numeric(14,2) not null default 0,
  descuento numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  retencion numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  pagado numeric(14,2) not null default 0,
  moneda text not null default 'EUR',
  coupon_id uuid references public.coupons(id),
  factura_origen_id uuid references public.invoices(id),
  notas text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  application_id uuid references public.applications(id),
  concepto text not null,
  tipo_cargo text not null default 'fijo',
  cantidad numeric(14,4) not null default 1,
  precio_unitario numeric(14,4) not null default 0,
  descuento_pct numeric(6,2) not null default 0,
  iva_pct numeric(6,2) not null default 21,
  importe numeric(14,2) not null default 0,
  orden integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);

-- ============ MÓDULO 9: COBROS ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  uuid uuid not null default gen_random_uuid(),
  referencia text not null unique,
  invoice_id uuid references public.invoices(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  importe numeric(14,2) not null default 0,
  estado public.payment_status not null default 'pendiente',
  metodo public.payment_method not null default 'transferencia',
  fecha_prevista date, fecha_cobro date, fecha_devolucion date,
  conciliado boolean not null default false, fecha_conciliacion date,
  aviso_enviado boolean not null default false,
  observaciones text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);

-- ============ MÓDULO 10: FINANCIERO ============
create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, nombre text not null, descripcion text,
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, nombre text not null,
  naturaleza public.account_kind not null,
  parent_id uuid references public.ledger_accounts(id),
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, fecha date not null default current_date,
  concepto text not null, ejercicio integer not null default extract(year from now()),
  cost_center_id uuid references public.cost_centers(id),
  invoice_id uuid references public.invoices(id) on delete set null,
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.ledger_accounts(id),
  descripcion text,
  debe numeric(14,2) not null default 0,
  haber numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);

-- ============ MÓDULO 11: GESTIÓN DOCUMENTAL ============
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  uuid uuid not null default gen_random_uuid(),
  nombre text not null, tipo public.doc_type not null default 'otro',
  descripcion text, storage_path text, mime_type text, tamano_bytes bigint,
  version integer not null default 1,
  parent_document_id uuid references public.documents(id),
  client_id uuid references public.clients(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  etiquetas text[] default '{}',
  estado public.record_status not null default 'activo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);

-- ============ MÓDULO 12: SOPORTE ============
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  uuid uuid not null default gen_random_uuid(),
  referencia text not null unique,
  asunto text not null, descripcion text,
  estado public.ticket_status not null default 'abierto',
  prioridad public.ticket_priority not null default 'media',
  categoria text,
  client_id uuid references public.clients(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  asignado_a uuid references auth.users(id) on delete set null,
  fecha_apertura timestamptz not null default now(),
  fecha_cierre timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);
create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  autor_nombre text,
  mensaje text not null,
  interno boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, created_by uuid, updated_by uuid
);

-- ============ AUDITORÍA ============
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  modulo text not null, entidad text not null, entidad_id uuid,
  accion text not null, valor_anterior jsonb, valor_nuevo jsonb,
  user_id uuid references auth.users(id) on delete set null,
  user_email text, ip text,
  created_at timestamptz not null default now()
);

-- ============ GRANTS + RLS ============
do $$
declare t text;
begin
  foreach t in array array['clients','applications','invoice_series','coupons','invoices','invoice_lines','payments','cost_centers','ledger_accounts','journal_entries','journal_lines','documents','tickets','ticket_comments','audit_log']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_auth_read" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s_auth_insert" on public.%1$I for insert to authenticated with check (true)', t);
    execute format('create policy "%1$s_auth_update" on public.%1$I for update to authenticated using (true) with check (true)', t);
    execute format('create policy "%1$s_auth_delete" on public.%1$I for delete to authenticated using (true)', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- audit_log no debe ser editable/borrable
drop policy "audit_log_auth_update" on public.audit_log;
drop policy "audit_log_auth_delete" on public.audit_log;
drop trigger trg_audit_log_updated on public.audit_log;

-- índices
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_estado on public.invoices(estado);
create index idx_lines_invoice on public.invoice_lines(invoice_id);
create index idx_payments_invoice on public.payments(invoice_id);
create index idx_payments_estado on public.payments(estado);
create index idx_jlines_entry on public.journal_lines(entry_id);
create index idx_documents_client on public.documents(client_id);
create index idx_tickets_estado on public.tickets(estado);
create index idx_audit_entidad on public.audit_log(entidad, entidad_id);

-- ============ DATOS DE EJEMPLO ============
insert into public.clients (id, razon_social, nombre_comercial, nif, direccion, provincia, pais, persona_contacto, email, telefono, web, sector, num_empleados, estado, etiquetas) values
('11111111-1111-1111-1111-111111111101','Innovatech Soluciones S.L.','Innovatech','B12345678','C/ Mayor 12','Madrid','España','Laura Gómez','laura@innovatech.es','+34 910 111 222','innovatech.es','Tecnología',85,'activo','{"premium","anual"}'),
('11111111-1111-1111-1111-111111111102','Grupo Andalus S.A.','Andalus','A87654321','Av. Andalucía 45','Sevilla','España','Miguel Ruiz','miguel@andalus.com','+34 954 333 444','andalus.com','Distribución',240,'activo','{"enterprise"}'),
('11111111-1111-1111-1111-111111111103','Bufete Vidal & Asociados','Vidal Legal','B22334455','Rambla 8','Barcelona','España','Anna Vidal','anna@vidal.legal','+34 933 555 666','vidal.legal','Legal',30,'activo','{"pyme"}'),
('11111111-1111-1111-1111-111111111104','Logística Norte S.L.','LogiNorte','B99887766','Pol. Ind. 3','Bizkaia','España','Iker Etxeberria','iker@loginorte.es','+34 944 777 888','loginorte.es','Logística',120,'activo','{"impago"}'),
('11111111-1111-1111-1111-111111111105','Clínica Salud Plus','SaludPlus','B55667788','C/ Salud 21','Valencia','España','Rosa Marín','rosa@saludplus.es','+34 963 999 000','saludplus.es','Sanidad',60,'inactivo','{"prueba"}');

insert into public.applications (id, nombre, descripcion, version, categoria, url, proveedor, modelo_cobro, precio_base, precio_usuario, precio_uso, estado) values
('22222222-2222-2222-2222-222222222201','DocuFlow','Gestión documental inteligente','3.2.0','Documental','https://docuflow.app','ServiceHub','hibrido',99.00,7.50,0.0100,'activo'),
('22222222-2222-2222-2222-222222222202','BillCore','Motor de facturación electrónica','2.8.1','Finanzas','https://billcore.app','ServiceHub','por_usuario',49.00,12.00,0,'activo'),
('22222222-2222-2222-2222-222222222203','InsightAI','Analítica y predicción con IA','1.4.0','Inteligencia','https://insightai.app','ServiceHub','por_uso',0,0,0.0250,'activo'),
('22222222-2222-2222-2222-222222222204','DeskHub','Soporte y tickets','5.0.3','Soporte','https://deskhub.app','ServiceHub','fijo',149.00,0,0,'activo');

insert into public.invoice_series (id, codigo, descripcion, prefijo, proximo_numero, ejercicio) values
('33333333-3333-3333-3333-333333333301','GEN','Serie general','FAC',1005,2026),
('33333333-3333-3333-3333-333333333302','REC','Serie rectificativas','REC',12,2026);

insert into public.coupons (codigo, descripcion, tipo, valor, valido_desde, valido_hasta, usos_maximos, usos_actuales) values
('BIENVENIDA10','10% primer año','porcentaje',10,'2026-01-01','2026-12-31',100,23),
('PARTNER50','50 € de descuento partner','importe',50,'2026-01-01','2026-06-30',50,8);

insert into public.invoices (id, numero, serie_id, client_id, tipo, estado, periodicidad, fecha_emision, fecha_vencimiento, periodo_desde, periodo_hasta, base_imponible, descuento, iva, retencion, total, pagado) values
('44444444-4444-4444-4444-444444444401','FAC-2026-1001','33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','ordinaria','pagada','mensual','2026-06-01','2026-06-30','2026-06-01','2026-06-30',1240.00,0,260.40,0,1500.40,1500.40),
('44444444-4444-4444-4444-444444444402','FAC-2026-1002','33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111102','ordinaria','emitida','mensual','2026-07-01','2026-07-31','2026-07-01','2026-07-31',3480.00,180.00,693.00,0,3993.00,0),
('44444444-4444-4444-4444-444444444403','FAC-2026-1003','33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111103','ordinaria','vencida','trimestral','2026-04-01','2026-05-01','2026-04-01','2026-06-30',870.00,0,182.70,0,1052.70,0),
('44444444-4444-4444-4444-444444444404','FAC-2026-1004','33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111104','ordinaria','parcial','anual','2026-01-15','2026-02-15','2026-01-01','2026-12-31',7200.00,720.00,1360.80,0,7840.80,3000.00),
('44444444-4444-4444-4444-444444444405','REC-2026-0011','33333333-3333-3333-3333-333333333302','11111111-1111-1111-1111-111111111101','rectificativa','emitida','puntual','2026-06-20','2026-07-20','2026-06-01','2026-06-30',-120.00,0,-25.20,0,-145.20,0),
('44444444-4444-4444-4444-444444444406','FAC-2026-1005','33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111105','ordinaria','borrador','mensual','2026-08-01','2026-08-31','2026-08-01','2026-08-31',420.00,0,88.20,0,508.20,0);
update public.invoices set factura_origen_id = '44444444-4444-4444-4444-444444444401' where id = '44444444-4444-4444-4444-444444444405';

insert into public.invoice_lines (invoice_id, application_id, concepto, tipo_cargo, cantidad, precio_unitario, iva_pct, importe, orden) values
('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222201','DocuFlow - cuota base','fijo',1,99.00,21,99.00,1),
('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222201','DocuFlow - usuarios activos','por_usuario',42,7.50,21,315.00,2),
('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222203','InsightAI - tokens consumidos','por_uso',33040,0.0250,21,826.00,3),
('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222202','BillCore - usuarios','por_usuario',180,12.00,21,2160.00,1),
('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222204','DeskHub - cuota fija','fijo',1,149.00,21,149.00,2),
('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222203','InsightAI - consumo','por_uso',46840,0.0250,21,1171.00,3),
('44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222201','DocuFlow trimestral','fijo',3,290.00,21,870.00,1),
('44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222202','BillCore anual','fijo',1,7200.00,21,7200.00,1),
('44444444-4444-4444-4444-444444444405','22222222-2222-2222-2222-222222222201','Abono exceso consumo junio','fijo',1,-120.00,21,-120.00,1),
('44444444-4444-4444-4444-444444444406','22222222-2222-2222-2222-222222222204','DeskHub - cuota fija','fijo',1,149.00,21,149.00,1),
('44444444-4444-4444-4444-444444444406','22222222-2222-2222-2222-222222222201','DocuFlow - usuarios','por_usuario',36,7.53,21,271.00,2);

insert into public.payments (referencia, invoice_id, client_id, importe, estado, metodo, fecha_prevista, fecha_cobro, conciliado, fecha_conciliacion, observaciones) values
('COB-2026-0001','44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111101',1500.40,'cobrado','sepa','2026-06-30','2026-06-29',true,'2026-06-30','Remesa SEPA junio'),
('COB-2026-0002','44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111102',3993.00,'pendiente','transferencia','2026-07-31',null,false,null,null),
('COB-2026-0003','44444444-4444-4444-4444-444444444403','11111111-1111-1111-1111-111111111103',1052.70,'impagado','domiciliacion','2026-05-01',null,false,null,'Devuelto por falta de saldo'),
('COB-2026-0004','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111104',3000.00,'cobrado','tarjeta','2026-02-15','2026-02-14',true,'2026-02-16','Pago parcial 1/2'),
('COB-2026-0005','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111104',4840.80,'pendiente','stripe','2026-08-15',null,false,null,'Segundo plazo'),
('COB-2026-0006',null,'11111111-1111-1111-1111-111111111105',250.00,'devuelto','paypal','2026-03-10',null,false,null,'Devolución solicitada por el cliente');

insert into public.cost_centers (codigo, nombre, descripcion) values
('CC-COM','Comercial','Equipo de ventas y marketing'),
('CC-TEC','Tecnología','Desarrollo e infraestructura'),
('CC-ADM','Administración','Back office y finanzas');

insert into public.ledger_accounts (id, codigo, nombre, naturaleza) values
('55555555-5555-5555-5555-555555555501','430000','Clientes','activo'),
('55555555-5555-5555-5555-555555555502','572000','Bancos c/c','activo'),
('55555555-5555-5555-5555-555555555503','700000','Ventas de servicios','ingreso'),
('55555555-5555-5555-5555-555555555504','477000','H.P. IVA repercutido','pasivo'),
('55555555-5555-5555-5555-555555555505','629000','Otros servicios','gasto'),
('55555555-5555-5555-5555-555555555506','410000','Acreedores','pasivo');

insert into public.journal_entries (id, numero, fecha, concepto, invoice_id) values
('66666666-6666-6666-6666-666666666601','AS-2026-0001','2026-06-01','Emisión factura FAC-2026-1001','44444444-4444-4444-4444-444444444401'),
('66666666-6666-6666-6666-666666666602','AS-2026-0002','2026-06-29','Cobro factura FAC-2026-1001','44444444-4444-4444-4444-444444444401'),
('66666666-6666-6666-6666-666666666603','AS-2026-0003','2026-07-01','Emisión factura FAC-2026-1002','44444444-4444-4444-4444-444444444402');

insert into public.journal_lines (entry_id, account_id, descripcion, debe, haber) values
('66666666-6666-6666-6666-666666666601','55555555-5555-5555-5555-555555555501','Cliente Innovatech',1500.40,0),
('66666666-6666-6666-6666-666666666601','55555555-5555-5555-5555-555555555503','Ventas junio',0,1240.00),
('66666666-6666-6666-6666-666666666601','55555555-5555-5555-5555-555555555504','IVA repercutido',0,260.40),
('66666666-6666-6666-6666-666666666602','55555555-5555-5555-5555-555555555502','Ingreso banco',1500.40,0),
('66666666-6666-6666-6666-666666666602','55555555-5555-5555-5555-555555555501','Cancelación cliente',0,1500.40),
('66666666-6666-6666-6666-666666666603','55555555-5555-5555-5555-555555555501','Cliente Andalus',3993.00,0),
('66666666-6666-6666-6666-666666666603','55555555-5555-5555-5555-555555555503','Ventas julio',0,3300.00),
('66666666-6666-6666-6666-666666666603','55555555-5555-5555-5555-555555555504','IVA repercutido',0,693.00);

insert into public.documents (nombre, tipo, descripcion, mime_type, tamano_bytes, version, client_id, invoice_id, etiquetas) values
('Contrato marco Innovatech 2026','contrato','Contrato de servicios SaaS','application/pdf',482311,3,'11111111-1111-1111-1111-111111111101',null,'{"firmado","2026"}'),
('FAC-2026-1001.pdf','factura','Factura junio Innovatech','application/pdf',118422,1,'11111111-1111-1111-1111-111111111101','44444444-4444-4444-4444-444444444401','{"facturacion"}'),
('Presupuesto Andalus ampliación','presupuesto','Ampliación 60 usuarios','application/pdf',94210,2,'11111111-1111-1111-1111-111111111102',null,'{"comercial"}'),
('Licencia DocuFlow Vidal','licencia','Licencia anual','application/pdf',52300,1,'11111111-1111-1111-1111-111111111103',null,'{"licencias"}'),
('Manual DeskHub v5','documentacion','Manual de usuario','application/pdf',2310442,5,null,null,'{"manual","soporte"}');

insert into public.tickets (id, referencia, asunto, descripcion, estado, prioridad, categoria, client_id, application_id, fecha_apertura, fecha_cierre) values
('77777777-7777-7777-7777-777777777701','TCK-2026-0001','Error al generar factura PDF','Al descargar el PDF aparece un error 500.','en_progreso','alta','Facturación','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222202','2026-07-20 09:12+00',null),
('77777777-7777-7777-7777-777777777702','TCK-2026-0002','Solicitud de nuevos usuarios','Necesitamos 20 licencias adicionales.','abierto','media','Suscripciones','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222201','2026-07-24 14:40+00',null),
('77777777-7777-7777-7777-777777777703','TCK-2026-0003','Domiciliación devuelta','El recibo ha sido devuelto por el banco.','pendiente','critica','Cobros','11111111-1111-1111-1111-111111111103',null,'2026-05-02 08:00+00',null),
('77777777-7777-7777-7777-777777777704','TCK-2026-0004','Consulta consumo IA','¿Cómo se calculan los tokens?','resuelto','baja','Consumo','11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222203','2026-06-10 11:20+00','2026-06-11 16:05+00'),
('77777777-7777-7777-7777-777777777705','TCK-2026-0005','Alta de usuario bloqueada','No se puede activar MFA.','cerrado','media','Usuarios','11111111-1111-1111-1111-111111111105',null,'2026-04-03 10:00+00','2026-04-05 12:30+00');

insert into public.ticket_comments (ticket_id, autor_nombre, mensaje, interno) values
('77777777-7777-7777-7777-777777777701','Soporte ServiceHub','Hemos reproducido el error, escalado a desarrollo.',false),
('77777777-7777-7777-7777-777777777701','Equipo técnico','Fallo en la plantilla PDF de la serie GEN.',true),
('77777777-7777-7777-7777-777777777702','Comercial','Enviamos presupuesto de ampliación.',false),
('77777777-7777-7777-7777-777777777703','Financiero','Contactado el cliente para nuevo cargo.',false),
('77777777-7777-7777-7777-777777777704','Soporte ServiceHub','Los tokens se facturan a 0,025 €/token.',false);

insert into public.audit_log (modulo, entidad, entidad_id, accion, valor_anterior, valor_nuevo, user_email, ip) values
('facturacion','invoices','44444444-4444-4444-4444-444444444401','update','{"estado":"emitida"}','{"estado":"pagada"}','admin@servicehub.es','92.184.10.4'),
('cobros','payments',null,'insert',null,'{"referencia":"COB-2026-0005","importe":4840.80}','financiero@servicehub.es','92.184.10.4'),
('soporte','tickets','77777777-7777-7777-7777-777777777704','update','{"estado":"en_progreso"}','{"estado":"resuelto"}','soporte@servicehub.es','88.12.44.9'),
('documental','documents',null,'insert',null,'{"nombre":"Manual DeskHub v5","version":5}','tecnico@servicehub.es','10.0.0.22');