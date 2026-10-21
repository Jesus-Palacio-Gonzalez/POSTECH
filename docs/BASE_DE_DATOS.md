# Base de datos (Supabase)

Todo el modelo vive en **`supabase/schema.sql`**. Se ejecuta una sola vez en Supabase → SQL Editor (es idempotente: si lo corres de nuevo no rompe nada).

## Cómo funciona el registro

1. La persona se registra en `/login?modo=registro` (el front envía `full_name` y `business_name` como metadata).
2. El trigger `handle_new_user` crea automáticamente el **negocio** (con el nombre indicado, o "Mi negocio" si no hay) y el **perfil** con rol `dueno`, y siembra 11 categorías y 15 modelos de moto.
3. Si el correo tiene una **invitación** pendiente, en vez de crear negocio la persona entra al equipo con el rol invitado.
4. Quien entra con **Google** no trae `business_name`, así que su negocio se llama "Mi negocio"; luego el dueño/admin puede renombrarlo (editando `negocios`).

Un usuario pertenece a **un** negocio (`perfiles.negocio_id`). Todas las tablas tienen `negocio_id` y RLS: nadie ve datos de otro negocio.

## Roles (`rol_usuario`)

| Rol | Puede |
| --- | --- |
| `dueno`, `admin` | Todo: catálogo, compras, equipo, invitaciones, anular ventas |
| `cajero` | Ventas, clientes, motos, órdenes (crear/editar); lee ventas e inventario |
| `mecanico` | Solo ve y edita las órdenes de taller que tiene asignadas |

## Escrituras sensibles: por funciones (RPC)

Ventas, ítems y movimientos de inventario **no** se insertan directo; el stock solo cambia por movimientos.

```ts
supabase.rpc('registrar_venta',  { p_items: [{ producto_id, cantidad }], p_metodo: 'efectivo' })
supabase.rpc('anular_venta',     { p_venta: id, p_motivo: 'error de digitación' })
supabase.rpc('entregar_orden',   { p_orden: id, p_metodo: 'efectivo' })
supabase.rpc('recibir_compra',   { p_compra: id })
supabase.rpc('ajustar_stock',    { p_producto: id, p_stock_real: 12 })
supabase.rpc('buscar_productos', { p_texto: 'kit', p_modelo: modeloId })
```

## Reglas de venta

- **Sin stock no se vende:** si una línea pide más de lo que hay, `registrar_venta` (y `entregar_orden`) cancelan toda la venta con "Stock insuficiente de …". El front también lo avisa antes de cobrar.
- **IVA:** cada producto tiene su `iva_porcentaje` y los precios de venta **incluyen** el IVA. La venta guarda el impuesto incluido; el comprobante muestra base gravable e IVA.
- **Precios y descuentos:** el cajero vende al precio del catálogo; solo dueño y administrador cambian precios o aplican descuentos en el Mostrador.
- **Anular:** solo dueño y administrador; devuelve el stock.

## Datos fiscales y logo

`negocios` guarda `razon_social`, `nit`, `regimen`, `direccion`, `ciudad`, `telefono`, `email`, `pie_comprobante` y `logo_url`. Se editan en **Configuración** (dueño/admin). El logo se sube al bucket público `logos` (carpeta = id del negocio, máx. 1 MB, PNG/JPG/WebP) y se usa como avatar y en el comprobante.

> Si ya habías ejecutado una versión anterior de `schema.sql`, vuelve a ejecutarla completa: agrega las columnas nuevas, el bloqueo de stock, la columna `venta_items.linea` y el bucket de logos sin tocar tus datos.

## Qué usa el front hoy

- `NegocioContext` lee `perfiles` (rol, nombre) con su `negocios`, y permite renombrar el negocio (dueño/admin).
- `useResumen` (dashboard) lee `ventas` completadas de los últimos 7 días, `ordenes_taller` activas (con `motos` y mecánico) y `productos` con stock en o bajo el mínimo. Todo pasa por RLS: el mecánico solo ve sus órdenes y no ve ventas.
- `Mostrador` usa `buscar_productos`, `registrar_venta` y `clientes`; `Ventas` lista `ventas` y llama `anular_venta`; `Configuración` actualiza `negocios` y el bucket `logos`.
- Si el negocio no tiene datos todavía, el dashboard muestra mensajes vacíos en vez de cifras de ejemplo.
