# Pruebas Locales link? (Testing Locally)

Para probar este paquete localmente sin tener que subirlo a npm, puedes seguir cualquiera de estos métodos.

## 1. Usando el Playground interno

Hemos incluido una carpeta `playground` con un script de prueba rápido.

1. Asegúrate de haber construido el paquete:
   ```bash
   npm run build
   ```
2. Ejecuta el script de prueba usando `tsx`:
   ```bash
   npx tsx playground/test-dist.js
   ```

## 2. Usando `npm link` (Recomendado para desarrollo activo)

Este método crea un enlace simbólico entre tu paquete local y tu aplicación de prueba.

### En este repositorio (`zas-sso-client`):
1. Construye el proyecto:
   ```bash
   npm run build
   ```
2. Crea el link global:
   ```bash
   npm link
   ```

### En tu aplicación de destino (ej: `mi-app-nextjs`):
1. Vincula el paquete:
   ```bash
   npm link zas-sso-client
   ```
2. Ahora puedes importar el paquete normalmente:
   ```javascript
   import { initSSO } from 'zas-sso-client';
   ```

**Nota:** Si realizas cambios en `zas-sso-client`, asegúrate de volver a ejecutar `npm run build` para que se reflejen en tu aplicación.

---

## 3. Usando `npm pack` (Prueba de publicación real)

Este método genera un archivo `.tgz` idéntico al que se subiría a npm.

### En este repositorio (`zas-sso-client`):
1. Genera el paquete:
   ```bash
   npm pack
   ```
   Esto creará un archivo como `zas-sso-client-1.2.35.tgz`.

### En tu aplicación de destino:
1. Instala el archivo directamente:
   ```bash
   npm install /ruta/a/zas-sso-client/zas-sso-client-1.2.35.tgz
   ```

---

## 4. Pruebas Automatizadas

Puedes ejecutar las pruebas unitarias usando Vitest:

```bash
npm test
```

Para mantener las pruebas en modo observador (watch mode):

```bash
npm run test:watch
```
