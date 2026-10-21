# Login con Google (Google Cloud + Supabase)

La app ya tiene el botón "Continuar con Google" (`signInWithOAuth`). Falta crear las credenciales en Google y pegarlas en Supabase. Los nombres de los menús de Google cambian a veces; hoy se agrupan en **Google Auth Platform**.

## 1. Google Cloud Console

1. Entra a <https://console.cloud.google.com> y crea un proyecto (por ejemplo "POSTECH") o elige uno existente.
2. Abre **Google Auth Platform** (buscador de la consola) y pulsa **Comenzar** si es la primera vez.
3. **Branding**: nombre de la app (`POSTECH`), correo de asistencia al usuario y logo (opcional).
4. **Audience (Público)**: elige **External (Externo)**.
   - En estado *Testing* solo pueden entrar los correos que agregues como "Test users" y las sesiones caducan a los 7 días.
   - Cuando vayas a producción pulsa **Publish app**. Con los permisos básicos (openid, email, profile) no requiere verificación.
5. **Data Access (Acceso a los datos)**: agrega los permisos `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile` (los dos últimos suelen venir por defecto). No agregues más: los permisos sensibles piden una verificación larga.
6. **Clients (Clientes)** → **Create client** → tipo **Web application**:
   - **Authorized JavaScript origins**: `http://localhost:5173` (desarrollo) y tu dominio real, por ejemplo `https://postech.tudominio.com`. Solo el origen, sin ruta.
   - **Authorized redirect URIs**: la URL de callback de Supabase. Cópiala desde Supabase (paso 2); tiene la forma `https://<REF-DE-TU-PROYECTO>.supabase.co/auth/v1/callback`.
7. **Create** y guarda el **Client ID** y el **Client secret**.

## 2. Supabase

1. Dashboard → **Authentication → Providers (Sign In / Providers) → Google**.
2. Copia ahí la **Callback URL** (y pégala en Google, paso 1.6).
3. Activa el proveedor, pega **Client ID** y **Client secret** y guarda.
4. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` (cámbiala por tu dominio en producción).
   - **Redirect URLs**: `http://localhost:5173/app` y `http://localhost:5173/restablecer` (más las de tu dominio).

## 3. Probar

1. `npm run dev` → `/login` → **Continuar con Google**.
2. Elige tu cuenta. Vuelves a `/app`; si es tu primera vez, verás "Crea tu negocio".
3. Si Google muestra `redirect_uri_mismatch`, la URI de callback de Google no coincide exactamente con la de Supabase. Si dice `access_denied` en modo *Testing*, agrega tu correo como Test user.

## Seguridad

- El **Client secret** va solo en Supabase, nunca en el código del front ni en el `.env` de Vite.
- Antes de publicar, quita `http://localhost:5173` de los orígenes autorizados si no lo necesitas en producción.
