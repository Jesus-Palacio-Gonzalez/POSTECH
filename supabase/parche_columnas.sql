-- Parche mínimo y seguro: solo agrega las columnas que usa el front (Mostrador, comprobante).
-- Ejecútalo si schema.sql no terminó. Luego vuelve a ejecutar schema.sql completo.
alter table public.negocios add column if not exists razon_social     text;
alter table public.negocios add column if not exists regimen          text;
alter table public.negocios add column if not exists email            text;
alter table public.negocios add column if not exists logo_url         text;
alter table public.negocios add column if not exists pie_comprobante  text;
alter table public.venta_items add column if not exists linea bigint generated always as identity;
notify pgrst, 'reload schema';
