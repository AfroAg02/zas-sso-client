## auth-sso (Paquete SSO para Next.js)

Módulo que habilita autenticación SSO basada en tokens (access / refresh) con manejo de sesión en cookies cifradas, refresco automático y control de permisos.

---

## 1. Instalación

```
npm install zas-sso-client --legacy-peer-deps
# o
pnpm add zas-sso-client
```

Variables de entorno mínimas (ejemplo `.env.local`):

```
ENCRYPTION_SECRET=una_clave_de_32+_caracteres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

El resto (endpoints SSO / API) puedes suministrarlos vía `initSSO`.

---

## 2. Inicialización básica

En `middleware.ts` (raíz del proyecto Next.js 13+ app router):

```ts
import { initSSO } from "zas-sso-client";

// Rutas que requieren sesión. Si omites protectedRoutes => TODAS requieren auth.
const { middleware, config } = initSSO({
  protectedRoutes: ["/dashboard", "/settings"],
  cookieName: "session", // opcional (default: session)
  cookieMaxAgeSeconds: 60 * 60 * 24 * 7, // opcional (7 días)
  appUrl: process.env.NEXT_PUBLIC_APP_URL, // necesario para callback
  ssoUrl: "https://login.zasdistributor.com/login", // URL del login SSO
  redirectUri: "/", // a dónde redirigir tras callback
  endpoints: {
    login: "https://api.zasdistributor.com/api/auth/login",
    refresh: "https://api.zasdistributor.com/api/auth/refresh",
    me: "https://api.zasdistributor.com/api/users/me",
  },
});

export { middleware };
export const configExport = config; // renombra si tu build exige 'config'
export const config = config; // si Next exige exactamente 'config'
```

> Nota: Si tu bundler requiere que el objeto se llame exactamente `config`, exponlo así. Aquí ambos ejemplos.

---

## 3. Provider en layout

En `src/app/layout.tsx` (o el layout raíz que envuelve tus páginas protegidas):

```tsx
import { SSOProvider, Refresh } from "zas-sso-client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <SSOProvider>
          {/* Refresh gestiona el auto-refresh silencioso del access token */}
          <Refresh>{children}</Refresh>
        </SSOProvider>
      </body>
    </html>
  );
}
```

---

## 4. Callback (Route Handler)

Tu SSO externo redirige a: `https://TU_APP/api/sso/callback?accessToken=...&refreshToken=...`.

En tu `app/api/sso/callback/route.ts` puedes simplemente re-exportar los handlers:

```ts
export { ssoHandlers as GET } from "zas-sso-client";
```

(Ajusta según convención de tu versión Next).

---

## 5. Uso en componentes

```tsx
import { useAuth, redirectToLogin, serverSignOut } from "zas-sso-client";

export function UserWidget() {
  const { user, status, signOut, isLoading } = useAuth();
  if (isLoading) return <span>Cargando...</span>;
  if (status === "unauthenticated") {
    return (
      <button onClick={() => redirectToLogin({ preservePath: true })}>
        Ingresar
      </button>
    );
  }
  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={() => signOut()}>Salir</button>
    </div>
  );
}
```

Para cerrar sesión desde server (ej. en una Server Action):

```ts
import { serverSignOut } from "zas-sso-client";

export async function action() {
  await serverSignOut();
}
```

---

## 6. Permisos

Hooks (cliente) basados en React Query:

```tsx
import { usePermissions, usePermissionCheck } from "zas-sso-client";

function PermissionsPanel() {
  const { data: perms, isLoading } = usePermissions();
  const { data: canReadReports } = usePermissionCheck("REPORTS_READ");
  if (isLoading) return <p>Cargando...</p>;
  return (
    <div>
      <p>Tengo {perms?.length} permisos</p>
      {canReadReports && <button>Ver Reportes</button>}
    </div>
  );
}
```

En server:

```ts
import {
  fetchMyPermissions,
  checkPermission,
  getCookiesSession,
} from "zas-sso-client";

export async function GET() {
  const session = await getCookiesSession();
  const perms = await fetchMyPermissions();
  const can = await checkPermission("REPORTS_READ");
  return Response.json({ session, perms, can });
}
```

---

## 7. Arquitectura (Esquema)

```
[ Navegador ]
		 | (1) Accede a ruta protegida
		 v
[ Next.js Middleware ] --¿Sesión válida?--> Sí -> continúa
		 | No                     |
		 v                        | accessToken expirado?
	Redirige a SSO (login)       | Sí + refreshToken vigente
		 |                        v
		 |              [ Refresh preventivo en middleware ]
		 |              POST /auth/refresh → nuevos tokens
		 |              → escribe cookie cifrada en response
		 |                        |
		 +------------------------+
		 |
		 | (2) Usuario se autentica en SSO externo
		 v
SSO redirige a /api/sso/callback?accessToken&refreshToken
		 |
		 v
[ Handler callback guarda sesión (cookies cifradas) ]
		 |
		 v
Redirección segura a redirectUri
		 |
		 v
[ Cliente monta <SSOProvider> ]
		 |
		 | (3) Hook useAuth lee cookies vía server action
		 v
Tokens en memoria
```

### Flujo de Refresh de Tokens

El refresco de tokens opera en **dos capas** con protección contra condiciones de carrera:

#### Capa 1: Refresh preventivo (Middleware)

Antes de que el SSR comience, el middleware detecta si el access token expiró y el refresh token sigue vigente. Si es así, llama al endpoint `/auth/refresh` y escribe la cookie actualizada en la respuesta.

**Importante para apps con middleware encadenado:** cuando el middleware SSO refresca tokens, la app consumidora debe propagar las cookies del response SSO tanto al `req` (para que middlewares posteriores lean la cookie nueva) como al response final (para que el browser la reciba). Ejemplo:

```ts
// middlewares/sso.ts
import { middleware } from "@/sso";

export const withSSO: MiddlewareFactory = (next) => async (req, event) => {
  const ssoRes = await middleware(req);
  if (ssoRes.status !== 200) return ssoRes;

  // Propagar cookies al request para middlewares/render posteriores
  for (const cookie of ssoRes.cookies.getAll()) {
    req.cookies.set(cookie.name, cookie.value);
  }

  const res = await next(req, event);

  // Copiar cookies del SSO middleware a la respuesta final
  for (const cookie of ssoRes.cookies.getAll()) {
    res.cookies.set(cookie);
  }

  return res;
};
```

#### Capa 2: Refresh reactivo (SSR / Server Actions)

Si el middleware no pudo refrescar (ej: la cookie aún no se propagó), `nextAuthFetch` detecta un 401 y delega al **coordinador de refresh** (`getServerValidToken`):

1. **Deduplicación**: Si hay 20 fetches concurrentes con 401, solo uno refresca. Los demás esperan la misma promesa.
2. **Blacklist**: Si el refresh falla con 4xx, el token se marca como fallido para no reintentar en el mismo ciclo.
3. **Cache de resultados**: Tras un refresh exitoso, el nuevo access token se cachea por 5 minutos mapeado al refresh token viejo. Así, si un nuevo render aún lee la cookie vieja, obtiene el token cacheado sin llamar al backend.

```
nextAuthFetch() detecta 401
  └─→ getServerValidToken(refreshToken)
       ├─ ¿Blacklisted? → null (no reintenta)
       ├─ ¿Cache hit? → devuelve accessToken cacheado
       ├─ ¿In-flight? → espera promesa existente
       └─ Nuevo → refreshSession()
            └─ POST /auth/refresh
            └─ authenticateWithTokens() → persiste en cookies
            └─ Cachea resultado (TTL 5min)
            └─ Retorna nuevo accessToken
```

Componentes clave:

- **Middleware**: fuerza autenticación + refresh preventivo en rutas protegidas.
- **Coordinador** (`refresh-coordinator.ts`): deduplicación, blacklist y cache de refreshes.
- **Cookies cifradas**: almacenan user + tokens (encrypted JWE + PBKDF2).
- **Server actions**: acceso a sesión y rotación de tokens.
- **Permisos**: fetch y verificación granular.

---

## 8. Buenas Prácticas

1. Minimiza superficie pública: importa solo desde el barrel `zas-sso-client`.
2. No expongas `encrypt/decrypt` ni manipules cookies manualmente; usa las funciones provistas.
3. Asegura `ENCRYPTION_SECRET` fuerte (32+ chars) y rota si sospechas compromiso.
4. Usa `preservePath` al redirigir para mejorar UX post-login.
5. Maneja expiración forzada: si `useAuth().status === "unauthenticated"` en zona protegida, redirige a login.
6. Evita almacenar tokens en `localStorage`; el paquete ya usa cookies httpOnly.
7. Para SSR crítico, puedes llamar a `getCookiesSession()` en un Server Component / Route Handler.
8. Agrega políticas CSP y SameSite=Lax/Strict según necesidad de seguridad.
9. Implementa control de errores en refresh: si repetidamente falla, limpia sesión y redirige.
10. Versiona endpoints externos; no dependas de cambios implícitos en la API.

---

## 9. API Pública resumida

Imports disponibles:

```
initSSO, SSO, getRedirectUri,
SSOProvider, AuthProvider, useAuthContext, useAuth, Refresh,
redirectToLogin, getLoginUrl, getJWTClaims,
fetchMyPermissions, checkPermission, usePermissions, usePermissionCheck,
serverSignOut, getCookiesSession, ssoHandlers,
Tipos: Tokens, SessionData, User, SSOInitOptions, etc.
```

---

## 10. Roadmap sugerido

- ~~Soporte de rotating refresh tokens~~ ✅ Implementado (coordinador con cache + blacklist).
- Integrar fallback de permisos cacheados.
- Añadir modo "public routes" explícito sin middleware.

---

## 11. Ejemplo rápido end-to-end

```txt
1. initSSO en middleware.ts
2. layout envuelve con <SSOProvider><Refresh/>
3. Ruta /api/sso/callback exporta ssoHandlers
4. Componente llama useAuth() y muestra user
5. Permisos: usePermissions() o checkPermission
```

---

## 12. Troubleshooting

| Problema                                  | Causa probable                                                                | Solución                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Loop redirecciones                        | redirectUri protegido sin sesión establecida                                  | Asegura que callback completa antes de proteger redirectUri o permite temporalmente esa ruta                    |
| No refresca token                         | exp ausente o reloj desfasado                                                 | Sincroniza hora servidor / valida claims del JWT                                                                |
| Error decrypt                             | ENCRYPTION_SECRET distinto entre build y runtime                              | Unifica variables de entorno                                                                                    |
| Permisos 401                              | accessToken expirado                                                          | Verifica que refresh endpoint responde 200 y formato tokens                                                     |
| Múltiples 401 tras refresh exitoso        | Middleware encadenado descarta cookies del response SSO                       | Propaga cookies del SSO middleware al request **y** al response final (ver ejemplo en sección 7)                |
| Refresh token ya rotado                   | El backend rota refresh tokens y la cookie aún tiene el viejo                 | El coordinador cachea el resultado por 5 min; si persiste, revisa que el middleware propague cookies            |
| fetch failed / ECONNABORTED en middleware | El endpoint de refresh no es alcanzable desde el entorno de middleware (Edge) | Verifica que `NEXT_PUBLIC_REFRESH_ENDPOINT` apunte a una URL pública y que el middleware no bloquee la conexión |

---

## 13. Seguridad

- Cookies httpOnly + cifrado simétrico (JWE AES-GCM) para defensa en profundidad.
- PBKDF2 con 100k iteraciones y salt por sesión.
- No se exponen claves ni tokens al cliente directamente fuera del access token en memoria.

---

## 14. Licencia

Propietario interno. Ajusta según distribución (MIT / Proprietary).

---

## 15. Extender el tipo `User` (Module Augmentation)

Este paquete expone un punto de augmentación para que puedas añadir campos propios al tipo `User` sin modificar el paquete.

- Base interna: `User` está compuesto como `BaseUser & UserExtras`.
- Tú puedes extender `UserExtras` desde tu proyecto consumidor.

Pasos:

1. Crea un archivo de declaración de tipos en tu app (por ejemplo `types/zas-sso-client.d.ts`).
2. Asegúrate de que tu `tsconfig.json` incluye ese archivo (vía `include`/`files` según tu setup).
3. Declara el módulo del paquete y extiende `UserExtras`:

```ts
// types/zas-sso-client.d.ts
declare module "zas-sso-client" {
  // Estos campos se suman a los de BaseUser (id, name, emails, phones, photoUrl, sessionId)
  interface UserExtras {
    role?: "admin" | "user";
    departmentId?: number;
    // añade aquí tus propiedades específicas
  }
}
```

Notas importantes:

- No puedes eliminar ni cambiar el tipo de las propiedades base (`BaseUser`). Sólo añadir campos nuevos.
- `User` seguirá teniendo las propiedades base y, además, las que declares en `UserExtras`.
- El nombre del módulo a declarar debe coincidir con el nombre del paquete: `zas-sso-client`.

Con esto, todos los lugares que usan `User` en tu app verán los campos adicionales sin importar directamente nada distinto del paquete.
