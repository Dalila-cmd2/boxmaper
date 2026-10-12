# BoxMaper — datos centralizados

Este repositorio guarda **solo los proyectos** (subproyectos, tablas, bornes, PDFs exportados no van aquí: se generan en la app).

Cada instalación de BoxMaper apunta aquí por defecto. **No hace falta reinstalar la app** cuando cambias el contenido: publicas desde tu copia y el resto de equipos lo reciben solos.

## Archivos

- `boxmaper-data.json` — índice con versión de datos y huellas de verificación.
- `proyectos/<id>.json` — un archivo por proyecto (formato `boxmaper-project`).

## Publicar cambios

1. En BoxMaper: **Ayuda → Datos y sincronización**.
2. Pega una clave de GitHub con permiso de escritura en este repositorio.
3. Marca los proyectos modificados, escribe un mensaje y pulsa **Publicar seleccionados**.

Los demás usuarios reciben los cambios al abrir la app, cada pocos minutos o al volver a la ventana.

## Validación

En el repositorio de la app (`boxmaper`):

```bash
npm run validate:data data-repo
```

GitHub Actions en este repositorio ejecuta la misma comprobación en cada `push`.
