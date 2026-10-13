# POSTECH

Punto de venta moderno. Esta primera entrega incluye la landing page y el login con Supabase.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Configuración de Supabase

1. **Authentication → Providers → Email**: activo. Si quieres que el registro entre directo sin confirmar correo, desactiva "Confirm email".
2. **Authentication → URL Configuration**: agrega `http://localhost:5173` como Site URL y estas Redirect URLs:
   - `http://localhost:5173/app`
   - `http://localhost:5173/restablecer`
   (y las equivalentes con tu dominio de producción).
3. **Google**: Authentication → Providers → Google, con el Client ID y Secret de Google Cloud Console.

## Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Landing (hero, características, precios, preguntas, contacto) |
| `/login` | Ingresar · `?modo=registro` crear cuenta · `?modo=recuperar` recuperar contraseña |
| `/restablecer` | Nueva contraseña (llega desde el correo) |
| `/app` | Dashboard con datos de ejemplo (ruta protegida) |

## Pendientes por definir

- Número real de WhatsApp y correo en `src/pages/Landing.tsx` (`WHATSAPP_NUMBER`, `CONTACT_EMAIL`).
- Precios y alcance de los planes (hoy son valores de ejemplo).
- Si despliegas en Vercel/Netlify, configura la redirección de todas las rutas a `index.html` (SPA).
