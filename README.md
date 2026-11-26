# Invitaciones de graduación — NOVAMARK

```
invitacion_graduacion/
├── landing_invitacion/   React + Vite  → invitación pública  (invitacion.novamark.com/<alumno>)
├── admin_invitacion/     Vue 3 + Vite  → panel de gestión    (panel.novamark.com)
└── supabase/
    ├── migrations/       esquema SQL: tablas, reglas RLS, funciones
    └── functions/
        ├── gestionar-usuarios/   crea profesores/alumnos, cambia contraseñas, elimina
        └── firmar-subida/        URL firmada para subir imágenes a Cloudflare R2
```

**Roles:** `superadmin` (colegios y usuarios) · `profesor` (alumnos de su colegio) · `alumno` (edita y publica su invitación).
Las reglas de acceso viven en la base de datos (RLS): aunque alguien manipule el navegador, un alumno no puede ver ni tocar datos de otro.

---

## 1. Supabase

1. Crea un proyecto en <https://supabase.com> (región sugerida: São Paulo).
2. **SQL Editor** → pega y ejecuta `supabase/migrations/20261126000000_esquema_inicial.sql`.
3. **Authentication → Sign In / Providers**
   - Desactiva **Allow new users to sign up** (las cuentas solo se crean desde el panel).
4. **Authentication → URL Configuration**
   - *Site URL*: `https://panel.novamark.com`
   - *Redirect URLs*: `https://panel.novamark.com/definir-contrasena` y `http://localhost:5174/definir-contrasena`
5. **Correo (importante):** el correo incluido en Supabase solo permite unos pocos envíos por hora.
   Para invitar alumnos por correo configura un SMTP propio en *Authentication → Emails → SMTP* (Resend, Brevo, etc.).
   Mientras tanto puedes usar la opción **“Contraseña temporal”** al crear usuarios.
6. **Tu usuario superadmin:**
   - *Authentication → Users → Add user* (correo + contraseña, marca *Auto confirm*).
   - En el SQL Editor (cambia el correo y el nombre):
     ```sql
     insert into public.perfiles (id, rol, nombre, email)
     select id, 'superadmin', 'Tu nombre', email from auth.users where email = 'tu-correo@ejemplo.com';
     ```

## 2. Cloudflare R2 (fotos de perfil y escudos)

1. **R2 → Create bucket** (ej. `invitaciones-media`).
2. **Acceso público:** en el bucket → *Settings → Public access* → conecta un dominio propio (ej. `media.novamark.com`) o activa la URL `r2.dev`.
3. **CORS** del bucket (*Settings → CORS policy*):
   ```json
   [
     {
       "AllowedOrigins": ["https://panel.novamark.com", "http://localhost:5174"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **R2 → Manage API tokens → Create API token** con permiso *Object Read & Write* solo para ese bucket.
   Guarda el **Access Key ID** y el **Secret Access Key**, y tu **Account ID**.

Las claves de R2 nunca llegan al navegador: el panel pide una URL firmada (válida 5 min) a la Edge Function, que además decide la ruta del archivo (`perfiles/<invitación>/…`, `escudos/<colegio>/…`).

## 3. Edge Functions

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) (desde `invitacion_graduacion/`):

```bash
npx supabase login
npx supabase link --project-ref <REF-DE-TU-PROYECTO>

npx supabase secrets set \
  ADMIN_URL=https://panel.novamark.com \
  R2_ACCOUNT_ID=<account-id> \
  R2_ACCESS_KEY_ID=<access-key-id> \
  R2_SECRET_ACCESS_KEY=<secret> \
  R2_BUCKET=invitaciones-media \
  R2_PUBLIC_URL=https://media.novamark.com

npx supabase functions deploy gestionar-usuarios
npx supabase functions deploy firmar-subida
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase automáticamente.)

## 4. Variables de entorno de las apps

Copia `.env.example` como `.env.local` en cada proyecto (los `.local` no se suben a git):

| Proyecto | Variables |
|---|---|
| `admin_invitacion` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LANDING_URL` |
| `landing_invitacion` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

Están en *Project Settings → API*. La **anon key** es pública por diseño; **nunca** pongas la `service_role` en estos archivos.

Sin `.env.local`, la landing funciona en **modo demo** (datos de prueba) y el panel muestra cómo configurarlo.

## 5. Desarrollo local

```bash
cd landing_invitacion && npm run dev   # http://localhost:5173/<slug-del-alumno>
cd admin_invitacion   && npm run dev   # http://localhost:5174
```

## 6. Publicación

Ambas apps son SPA estáticas (`npm run build` → carpeta `dist/`). Cualquier ruta debe responder con `index.html`:

- **Cloudflare Pages:** automático (no agregues un `404.html`).
- **Vercel:** `vercel.json` con `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
- **Netlify:** archivo `public/_redirects` con `/* /index.html 200`.

Las invitaciones llevan `noindex` y `robots.txt` para que no aparezcan en buscadores (son datos de colegiales).

---

## Flujo de uso

1. **Superadmin** crea el colegio (nombre, colores, escudo) y los profesores.
2. **Profesor** crea a sus alumnos (correo de invitación o contraseña temporal). A cada alumno se le crea automáticamente su invitación en borrador con una dirección como `/sebastian-rojas`.
3. **Alumno** ingresa, sube su foto, completa sus datos y el programa, revisa con el enlace de **vista previa** y pulsa **Publicar**.
4. Los invitados confirman asistencia (queda en el panel y, si hay WhatsApp, también abre el chat) y firman el libro (moderable desde el panel).

## Pendientes conocidos

- Al cambiar una foto o escudo, la imagen anterior queda en R2 (no se borra automáticamente).
- El tamaño de archivo se controla en el navegador (se recorta y comprime a ~800 px WebP antes de subir); la URL firmada no impone un límite propio.
- La protección contra spam en mensajes y confirmaciones es básica (límites de longitud y palabras en la base). Si hiciera falta, se puede agregar Cloudflare Turnstile.
