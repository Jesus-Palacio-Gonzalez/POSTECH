# POSTECH

Punto de venta para talleres y almacenes de repuestos de motos: landing, login con Supabase, base de datos multi-negocio y dashboard.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Base de datos

Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase (una sola vez; es idempotente). Al registrarse, un trigger crea el negocio y el perfil del dueño. Detalle del modelo, roles y funciones en [`docs/BASE_DE_DATOS.md`](docs/BASE_DE_DATOS.md).

## Variables de entorno

El archivo `.env` (que **no** se sube a git, ya está en `.gitignore`) guarda las claves de Supabase:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

- Se obtienen en Supabase → Project Settings → API (Project URL y la clave `anon` / `public`).
- Vite solo expone al navegador las variables que empiezan por `VITE_`.
- Nunca pongas la clave `service_role` en el front: da acceso total a la base de datos.
- Después de crear o cambiar el `.env`, reinicia `npm run dev`.
- En producción (Vercel, Netlify, etc.) se cargan en el panel del hosting, no con el archivo.

## Animación de entrada

`src/components/Splash.tsx` muestra una moto de carreras y una barra de carga al abrir el sitio. Aparece una vez por sesión del navegador (para verla de nuevo: cierra la pestaña o borra `postech-splash-visto` en Session Storage). Respeta la preferencia "reducir movimiento" del sistema.

## Configuración de Supabase

1. **Authentication → Providers → Email**: activo. Si quieres que el registro entre directo sin confirmar correo, desactiva "Confirm email".
2. **Authentication → URL Configuration**: agrega `http://localhost:5173` como Site URL y estas Redirect URLs:
   - `http://localhost:5173/app`
   - `http://localhost:5173/restablecer`
   (y las equivalentes con tu dominio de producción).
3. **Google**: paso a paso en [`docs/GOOGLE_LOGIN.md`](docs/GOOGLE_LOGIN.md).

## Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Landing (hero, características, precios, preguntas, contacto) |
| `/login` | Ingresar · `?modo=registro` crear cuenta · `?modo=recuperar` recuperar contraseña |
| `/restablecer` | Nueva contraseña (llega desde el correo) |
| `/app` | Resumen (ruta protegida): negocio y rol reales, ventas, órdenes y stock bajo |
| `/app/mostrador` | Venta de mostrador: buscador, carrito, formas de pago, cliente, comprobante imprimible |
| `/app/ventas` | Historial de ventas, reimpresión del comprobante y anulación (dueño/admin) |
| `/app/configuracion` | Datos fiscales y logo del negocio (edita dueño/admin) |

## Pendientes por definir

- Número real de WhatsApp y correo en `src/pages/Landing.tsx` (`WHATSAPP_NUMBER`, `CONTACT_EMAIL`).
- Precios y alcance de los planes (hoy son valores de ejemplo).
- Si despliegas en Vercel/Netlify, configura la redirección de todas las rutas a `index.html` (SPA).
