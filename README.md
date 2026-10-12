# BoxMaper v1.0 — Mapeador de instalación de domótica

Aplicación de escritorio (Tauri 2 + React + TypeScript) para documentar bornes, módulos y conexiones de instalaciones Loxone. Funciona sin conexión a Internet, organiza edificios por plantas y exporta fichas técnicas a PDF, Excel y CSV.

> BoxMaper es una herramienta independiente no afiliada a Loxone Electronics GmbH.

## Para usuarios: instalar

1. Abre la página de descarga del proyecto (ver «Publicación» más abajo) y descarga el instalador.
2. **Windows 10/11**: ejecuta el `.exe`. No necesita permisos de administrador y crea accesos directos en el escritorio y en el menú Inicio.
   - Si Windows muestra «Windows protegió su PC», pulsa **Más información → Ejecutar de todas formas**. Aparece porque el instalador aún no está firmado con un certificado de pago.
3. Abre **BoxMaper** y crea un proyecto nuevo.

Los proyectos se guardan automáticamente en tu equipo y también puedes guardarlos como archivos `.boxmaper`.

### Dos tipos de actualización (sin reinstalar por cada cambio)

| Qué cambia | Cómo llega a los usuarios |
|------------|---------------------------|
| **Contenido** (subproyectos, tablas, bornes) | Repositorio central `boxmaper-datos` en GitHub. La app lo consulta sola al abrir, cada pocos minutos y al volver a la ventana. Publicas desde **Ayuda → Datos y sincronización**. |
| **Programa** (nuevas funciones, correcciones) | Actualizador de Tauri: al abrir la app se descarga e instala la nueva versión y reinicia. También **Ayuda → Buscar actualizaciones**. |

Instalas BoxMaper **una sola vez**. Los cambios de datos no generan un instalador nuevo; solo subes la versión de datos. Los cambios de código sí publican una etiqueta `v1.x.x` en el repositorio `boxmaper`.

## Para desarrolladores

Requisitos: Node.js 20+, Rust estable y las [dependencias de Tauri](https://tauri.app/start/prerequisites/) para tu sistema.

```bash
npm install
npm run tauri:dev      # app de escritorio en modo desarrollo
npm run dev            # solo el frontend en el navegador (modo PWA)
npm run build          # comprueba tipos y compila el frontend
npm run tauri:build    # genera el instalador (src-tauri/target/release/bundle)
```

### Estructura

- `src/` — interfaz React (componentes, hooks, modelo de proyecto, exportaciones).
- `src-tauri/` — envoltorio de escritorio en Rust (ventana, diálogos, archivos, actualizador).
- `docs/` — página pública de descarga (GitHub Pages).
- `.github/workflows/` — compilación y publicación automática.

## Publicación y actualizaciones

El instalador y la página de descarga se publican con GitHub:

1. Sube el código a un repositorio de GitHub llamado `boxmaper`.
2. En el repositorio, añade los secretos (Settings → Secrets and variables → Actions):
   - `TAURI_SIGNING_PRIVATE_KEY`: contenido del archivo de clave privada de firma (`boxmaper.key`).
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: la contraseña de esa clave (vacía si no tiene).
3. Para publicar una versión: cambia el número de versión en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`, y sube una etiqueta:

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

   El flujo **Publicar versión** compila para Windows, macOS y Linux, sube los instaladores a *Releases* y genera `latest.json`, que las apps instaladas usan para actualizarse.
4. La página de descarga (`docs/`) se publica sola con GitHub Pages: `https://<usuario>.github.io/boxmaper/`.

> **Guarda la clave privada de firma** (`boxmaper.key`) en un lugar seguro y no la subas al repositorio. Si la pierdes, las apps ya instaladas no podrán actualizarse.

## Datos centralizados

Por defecto la app apunta al repositorio público **`Dalila-cmd2/boxmaper-datos`** (puedes cambiarlo en **Ayuda → Datos y sincronización**).

- **Solo lectura**: cualquier instalación recibe proyectos publicados sin configurar nada (repo público).
- **Publicar**: necesitas una clave de GitHub con permiso de escritura en ese repositorio.
- **Historial**: cada publicación queda en el historial de Git; puedes **volver a una versión anterior** desde el mismo panel.
- **Copias locales**: antes de aplicar cambios remotos, BoxMaper guarda copias en el equipo por si hay que deshacer.

Plantilla del repositorio de datos: carpeta `data-repo/` de este proyecto. Validación: `npm run validate:data`.

Copias portables: **Archivo → Guardar** (`.boxmaper`).
