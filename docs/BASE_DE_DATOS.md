# Base de datos (Supabase)

Todo el modelo vive en **`supabase/schema.sql`**. Se ejecuta una sola vez en Supabase → SQL Editor (es idempotente: si lo corres de nuevo no rompe nada).

## Cómo funciona el registro

1. La persona se registra en `/login?modo=registro` (el front envía `full_name` y `business_name` como metadata).
2. El trigger `handle_new_user` crea automáticamente el **negocio** (con el nombre indicado, o "Mi negocio" si no hay) y el **perfil** con rol `dueno`, y siembra 11 categorías y 15 modelos de moto.
3. Si el correo tiene una **invitación** pendiente, en vez de crear negocio la persona entra al equipo con el rol invitado.
4. Quien entra con **Google** no trae `business_name`, así que su negocio se llama "Mi negocio"; luego el dueño/admin puede renombrarlo (editando `negocios`).

Un usuario pertenece a **un** negocio (`perfiles.negocio_id`). Todas las tablas tienen `negocio_id` y RLS: nadie ve datos de otro negocio.

## Registrar mecánicos y personal (Configuración → Equipo)

El dueño o administrador crea el acceso con nombre, teléfono, correo y contraseña. Por dentro:

1. se guarda una **invitación** para ese correo con el rol elegido (solo dueño/admin pueden, por RLS);
2. se crea la cuenta con un cliente aparte que no guarda sesión (no te saca de la tuya);
3. el trigger `handle_new_user` ve la invitación y mete a la persona **en tu negocio** con ese rol (no crea un negocio nuevo).

El mecánico entra con ese correo y contraseña y aparece de inmediato en el selector de mecánico de las órdenes. Desde la misma sección se puede desactivar/activar a alguien y, solo el dueño, cambiar roles. No se usa la clave `service_role` (nunca debe ir en el navegador).

> Si en Supabase → Authentication → Providers → Email tienes **Confirm email** activado, la persona debe confirmar el correo que le llega antes de entrar. Para que entre directo, desactiva esa opción. Si olvida la contraseña, usa «¿Olvidaste tu contraseña?» en el login.

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
- `Órdenes` y `OrdenDetalle` usan `ordenes_taller`, `orden_items`, `motos`, `clientes` y la función `entregar_orden` (genera la venta y descuenta el stock al entregar; si falta un repuesto la entrega se bloquea). Los repuestos de una orden **no** descuentan stock hasta la entrega. El mecánico solo ve y avanza sus órdenes; no crea ni entrega.
- `Inventario` usa `productos`, `categorias`, `producto_compatibilidad`, `movimientos_inventario` y `ajustar_stock`. El stock nunca se edita directo: se fija al crear el producto (stock inicial) y después solo con «Ajustar stock».
- `Proveedores` usa `proveedores`, `compras`, `compra_items` y `recibir_compra`: la compra nace «pendiente» y el stock y el costo del producto se actualizan solo al recibirla (no se puede recibir dos veces ni editar una compra recibida). Solo dueño/admin.
- `Reportes` (dueño/admin) lee `ventas`, `venta_items`, `ordenes_taller` y `productos`: ventas por día y método de pago, más vendidos, utilidad bruta (venta sin IVA − costo), órdenes por mecánico, valor del inventario y exportación CSV.
- `Equipo` (Configuración) usa `perfiles` e `invitaciones` como se explicó arriba.
- Si el negocio no tiene datos todavía, el dashboard muestra mensajes vacíos en vez de cifras de ejemplo.
