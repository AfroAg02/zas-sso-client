---
name: tech-docs
description: "Genera documentación técnica completa en español para el proyecto zas-sso-client. Uso: documentar arquitectura, flujos, componentes, API, seguridad y dependencias del SDK. Use when: el usuario pide documentación técnica, analizar arquitectura, generar docs del proyecto, explicar componentes o flujos."
argument-hint: "Especifica secciones adicionales o enfoque particular (ej: solo seguridad, solo permisos)"
---

# Documentación Técnica — zas-sso-client

Eres un analista senior de software especializado en documentación técnica. Genera un documento MD completo, detallado, organizado y legible en **español**.

## Cuándo Usar

- El usuario pide documentar el proyecto o su arquitectura
- Se necesita una referencia técnica completa del SDK
- Se quiere entender flujos, componentes o decisiones de diseño

## Procedimiento

### Paso 1 — Explorar el código fuente

Lee todos los archivos del proyecto para obtener contexto real y actualizado. No asumas nada; basa todo en el código existente.

Archivos clave a leer:

- `package.json` — versión, dependencias, exports, scripts
- `tsconfig.json`, `tsup.config.ts` — configuración de build
- `src/index.ts` — API pública (barrel exports)
- `src/edge.ts` — exports seguros para edge runtime
- `src/init-config.ts` — inicialización y configuración
- `src/lib/*` — capa de utilidades (crypto, cookies, API, URLs, middleware, JWT)
- `src/services/*` — lógica de negocio (handlers, refresh, sesión, server actions)
- `src/context/auth-context.tsx` — estado React de autenticación
- `src/providers/sso-provider.tsx` — provider wrapper
- `src/hooks/use-auth.ts` — hook de autenticación
- `src/permissions-control/*` — sistema de permisos
- `src/types/*` — tipos e interfaces
- `src/utils/*` — utilidades auxiliares
- `README.md`, `TESTING_LOCALLY.md` — documentación existente

### Paso 2 — Generar el documento

Produce un **único archivo MD** llamado `DOCUMENTATION.md` en la raíz del proyecto con **todas** las secciones siguientes. El documento debe ser exhaustivo y autosuficiente.

---

## Estructura del Documento

El documento generado DEBE contener estas secciones en este orden:

```
1.  Portada y Metadatos
2.  Tabla de Contenidos
3.  Resumen Ejecutivo
4.  Requisitos y Dependencias
5.  Instalación y Configuración
6.  Arquitectura General
7.  Estructura del Proyecto
8.  Puntos de Entrada (Exports)
9.  Capa de Configuración
10. Capa de Seguridad y Criptografía
11. Capa HTTP y API
12. Capa de Servicios
13. Middleware (Protección de Rutas)
14. Capa de Cliente React
15. Sistema de Permisos
16. Sistema de Tipos
17. Utilidades
18. Flujos de Autenticación
19. Diagramas (Mermaid)
20. Contratos de API/Endpoints
21. Variables de Entorno
22. Guía de Testing
23. Seguridad y Buenas Prácticas
24. Glosario
25. Changelog / Historial de Versiones
```

---

## Directrices por Sección

### 1. Portada y Metadatos

- Nombre del proyecto, versión (de `package.json`), fecha de generación
- Autor/organización si está disponible
- Badges de tecnologías principales

### 2. Tabla de Contenidos

- Links internos a cada sección y subsección
- Generada automáticamente basada en los headers

### 3. Resumen Ejecutivo

- Qué es el proyecto (1-2 párrafos)
- Problema que resuelve
- Stack tecnológico (Next.js, React, jose, TanStack Query)
- Estado actual del proyecto

### 4. Requisitos y Dependencias

- Tabla con TODAS las dependencias y peerDependencies
- Versiones mínimas requeridas
- Clasificar: runtime vs dev vs peer
- Explicar el propósito de cada dependencia principal

### 5. Instalación y Configuración

- Comando de instalación
- Variables de entorno necesarias (tabla con nombre, descripción, requerido/opcional, ejemplo)
- Configuración mínima paso a paso
- Ejemplo de `initSSO()` con todas las opciones

### 6. Arquitectura General

- Descripción de las 3 capas: Edge, Servicios, Cliente
- Diagrama Mermaid de la arquitectura
- Justificación de las decisiones de diseño
- Patrón de separación edge-safe vs server-only vs client

### 7. Estructura del Proyecto

- Árbol de archivos completo con descripción de cada directorio
- Propósito de cada carpeta
- Archivos vacíos/reservados para futuro (client/, server/, shared/, entries/)

### 8. Puntos de Entrada (Exports)

- Tabla de todo lo exportado por `index.ts`
- Tabla de todo lo exportado por `edge.ts`
- Cuándo usar cada entry point
- Configuración de exports en `package.json`

### 9. Capa de Configuración

- `init-config.ts`: funciones, parámetros, valores por defecto
- `SSOInitOptions`: todas las propiedades con tipos y descripción
- Normalización de URLs
- Flujo de inicialización

### 10. Capa de Seguridad y Criptografía

- `crypto.ts`: algoritmos usados (AES-GCM, PBKDF2), formato de cifrado
- `cookies.ts`: gestión de cookies, opciones de seguridad (httpOnly, Secure, SameSite)
- `decode.ts`: parsing de JWT (sin verificación)
- Análisis de seguridad de cada decisión
- Formato `saltHex:JWE` explicado

### 11. Capa HTTP y API

- `api.ts`: clase `ApiError`, `ApiResponse<T>`, funciones de manejo de errores
- `url.ts`: construcción de URLs de login, redirección
- `parse-redirect-url.ts`: validación de redirects (same-origin)
- Contratos de request/response

### 12. Capa de Servicios

Para CADA archivo en `src/services/`:

- Propósito y responsabilidad
- Funciones exportadas con firma completa
- Parámetros de entrada y salida (tipos)
- Flujo lógico paso a paso
- Manejo de errores
- Especial detalle en:
  - `handlers.ts`: rutas GET/POST/DELETE
  - `server-actions.ts`: "use server" functions
  - `refresh-coordinator.ts`: mecanismo anti-concurrencia (Map + Set)
  - `session-logic.ts`: descifrado de sesión

### 13. Middleware

- `createSSOMiddleware()`: opciones, lógica de protección
- `buildMiddlewareConfig()`: generación de matchers
- Heurísticas de rutas protegidas
- `isProtected()` e `isStaticAsset()`
- Integración con Next.js middleware

### 14. Capa de Cliente React

- `AuthProvider`: estado, efectos, métodos
- `AuthContextState`: propiedades y status machine ("loading" | "authenticated" | "unauthenticated")
- `useAuth()`: uso y retorno
- `SSOProvider`: wrapper
- Ejemplo de uso en layout y componentes

### 15. Sistema de Permisos

- Arquitectura (server actions + React Query)
- `fetchMyPermissions()`: paginación, manejo de errores
- `checkPermission()`: verificación individual
- Hooks: `usePermissions()`, `usePermissionCheck()`
- Configuración de endpoints
- Interfaz `Permission`

### 16. Sistema de Tipos

- TODOS los tipos e interfaces definidos con sus propiedades
- `User`, `BaseUser`, `UserExtras` (module augmentation)
- `SessionData`, `Tokens`, `Email`, `Phone`
- `ApiResponse<T>`, `SSOInitOptions`
- Ejemplo de module augmentation

### 17. Utilidades

- `html-page-error.ts`: generación de páginas de error HTML
- Cualquier otra utilidad encontrada

### 18. Flujos de Autenticación

Describir paso a paso con diagramas Mermaid:

- **Login completo**: usuario → SSO → callback → sesión
- **Refresh de tokens**: expiración → coordinador → nuevo token
- **Logout**: componente → server action → limpieza
- **Protección de rutas**: request → middleware → validación → redirect/allow
- **Verificación de permisos**: componente → hook → server action → API

### 19. Diagramas (Mermaid)

Incluir al menos:

- Diagrama de arquitectura de capas
- Diagrama de secuencia: flujo de login
- Diagrama de secuencia: refresh de tokens
- Diagrama de secuencia: middleware protection
- Diagrama de flujo: decisión de protección de rutas
- Diagrama de componentes React

### 20. Contratos de API/Endpoints

Tabla con:

- Endpoint interno (route handlers)
- Método HTTP
- Parámetros (query, body)
- Response esperado
- Códigos de estado
- Endpoints externos consumidos (SSO server, permissions API)

### 21. Variables de Entorno

Tabla completa:
| Variable | Descripción | Requerida | Default | Ejemplo |
Incluir TODAS las variables referenciadas en el código

### 22. Guía de Testing

- Herramientas (Vitest)
- Tests existentes y qué cubren
- Cómo ejecutar tests
- Testing local (npm link, npm pack, playground)
- Referencia a `TESTING_LOCALLY.md`

### 23. Seguridad y Buenas Prácticas

- Análisis OWASP aplicado al proyecto
- Cifrado de cookies (AES-GCM 256-bit)
- Derivación de claves (PBKDF2 100k iteraciones)
- Protección contra CSRF (state parameter)
- Validación de redirects (same-origin)
- httpOnly / Secure / SameSite
- No verificación de JWT (trade-off documentado)
- Mejores prácticas de implementación

### 24. Glosario

- Términos técnicos usados en el documento
- Acrónimos (SSO, JWT, JWE, PBKDF2, AES-GCM, etc.)

### 25. Changelog

- Versión actual y notas conocidas
- Roadmap si existe en README

---

## Reglas de Formato

1. **Idioma**: Todo en español
2. **Código**: Bloques con syntax highlighting (`typescript`, `bash`, `json`)
3. **Tablas**: Para datos tabulares (tipos, endpoints, variables)
4. **Diagramas**: Mermaid con sintaxis correcta (```mermaid)
5. **Links internos**: Tabla de contenidos navegable
6. **Longitud**: Sin límite — el documento debe ser exhaustivo
7. **Tono**: Técnico, profesional, directo
8. **Ejemplos**: Incluir código de ejemplo para cada caso de uso relevante

## Reglas de Calidad

- No inventar funcionalidad que no exista en el código
- Cada afirmación debe estar respaldada por el código fuente
- Documentar edge cases y limitaciones conocidas
- Señalar carpetas vacías (client/, server/, shared/, entries/) como reservadas
- Incluir número de línea o archivo de referencia cuando sea relevante

## Paso 3 — Guardar

Guardar el resultado como `DOCUMENTATION.md` en la raíz del proyecto.
