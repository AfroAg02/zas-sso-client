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
		 | No
		 v
	Redirige a SSO (login) --------------+
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
													[ Cliente monta <SSOProvider><Refresh/> ]
																				|
																				| (3) Hook useAuth lee cookies vía server action
																				v
															Tokens en memoria + refresh programado
```

Componentes clave:

- Middleware: fuerza autenticación en rutas protegidas.
- Cookies cifradas: almacenan user + tokens (encrypted JWE + PBKDF2).
- Refresh hook: programa la renovación antes de expirar el access token.
- Server actions: acceso a sesión y rotación de tokens.
- Permisos: fetch y verificación granular.

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

- (Opcional) Soporte de rotating refresh tokens.
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

| Problema           | Causa probable                                   | Solución                                                                                     |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Loop redirecciones | redirectUri protegido sin sesión establecida     | Asegura que callback completa antes de proteger redirectUri o permite temporalmente esa ruta |
| No refresca token  | exp ausente o reloj desfasado                    | Sincroniza hora servidor / valida claims del JWT                                             |
| Error decrypt      | ENCRYPTION_SECRET distinto entre build y runtime | Unifica variables de entorno                                                                 |
| Permisos 401       | accessToken expirado                             | Verifica que refresh endpoint responde 200 y formato tokens                                  |

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
