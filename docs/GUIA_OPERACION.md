# Guía de operación en obra

## Instalación (una sola vez)

1. Descarga el instalador desde la [página de descarga](https://dalila-cmd2.github.io/boxmaper/).
2. Instala BoxMaper en Windows (o macOS/Linux).
3. Abre la app. Los proyectos publicados en el repositorio central se descargan solos si hay Internet.

## Roles

| Rol | Qué hace |
|-----|----------|
| **Editor** (oficina / técnico principal) | Edita proyectos, **publica** cambios en «Datos y sincronización» con token de escritura. |
| **Lector** (obra / otro PC) | Solo abre la app; recibe actualizaciones de datos sin reinstalar. Token opcional si el repo es privado. |

## Publicar cambios de contenido (sin reinstalar la app)

1. **Ayuda → Datos y sincronización**
2. Token con permiso de **escritura** en `boxmaper-datos` (ver abajo).
3. Marca proyectos modificados, mensaje descriptivo → **Publicar seleccionados**.

Los demás equipos verán los cambios al abrir la app, al volver a la ventana o en unos minutos (intervalo configurable).

## Crear un token de GitHub (mínimo privilegio)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** (fine-grained).
2. Repositorio: solo **`boxmaper-datos`** (o el tuyo).
3. Permisos: **Contents** → Read (recibir) o Read and write (publicar).
4. Pega el token en BoxMaper y **Guardar conexión**. No lo compartas por chat.

## Si hay conflicto

Si editaste en dos sitios a la vez, BoxMaper **no pisa** datos: muestra el conflicto en «Datos y sincronización». Elegí **Conservar la mía** o **Usar la publicada** (se guarda copia local antes).

## Volver atrás

- **Historial de versiones** en el panel de datos (publica una versión anterior como cambio nuevo).
- **Copias de seguridad en este equipo** antes de cada actualización remota.

## Actualizar el programa (nuevas funciones)

**Ayuda → Buscar actualizaciones** o el aviso en la barra superior → **Actualizar ahora**. No hace falta descargar otro instalador manualmente.

## Sustituir el proyecto de demostración

El repositorio puede incluir un proyecto «Demostración BoxMaper». Al publicar tu obra real (p. ej. Ordino Diamat), seleccionala en publicar; podés dejar de publicar el demo cuando ya no lo necesites.
