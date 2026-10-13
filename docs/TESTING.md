# Checklist de verificación antes de publicar

Ejecutar en desarrollo:

```bash
npm test
npm run validate:data
npm run build
```

## Prueba manual recomendada (2 equipos o perfiles)

- [ ] Instalar BoxMaper desde el `.exe` de la última release.
- [ ] Abrir sin Internet: proyecto local sigue editable; export PDF/CSV/Excel funciona.
- [ ] Con Internet: indicador «Datos vN» sin error (repo público).
- [ ] Editor: modificar un borne → publicar → lector recibe cambio sin reinstalar.
- [ ] Conflicto simulado: dos ediciones sin publicar → resolución en panel de datos.
- [ ] **Ayuda → Buscar actualizaciones** (si hay release anterior instalada).
- [ ] Edificio con 2+ subproyectos: ficha PDF por subproyecto e índice con páginas correctas.
- [ ] Cerrar app con cambios pendientes: al reabrir, datos conservados.

## Automatizado en CI

- Workflow **Comprobar código** en cada push a `main`.
- Workflow **Publicar versión** al subir etiqueta `v*`.
- Repositorio **boxmaper-datos**: workflow **Validar datos** en cada push.
