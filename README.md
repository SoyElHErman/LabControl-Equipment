# LabControl Herman Gajardo - Gestión de Equipos

App web estática para gestión de equipos de laboratorio con sesiones Supabase, roles y despliegue en Netlify.

Proyecto Supabase conectado: `LabControl-Equipment` (`https://jfyetfdtytsfphwgjkwa.supabase.co`).

## Configuración

1. Las migraciones SQL están en `supabase/migrations/`.
2. `app-config.js` ya apunta al proyecto Supabase creado.
3. Para usar otro proyecto, completa `app-config.js`:

```js
window.LABCONTROL_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabasePublishableKey: "sb_publishable_TU_LLAVE_PUBLICA"
};
```

## Sesiones y roles

El primer usuario que se registre queda como `Administrador`.
Los usuarios siguientes quedan como `Visualizador`, salvo que el administrador haya creado previamente una invitación con otro nivel.

- `Administrador`: acceso total y gestión de usuarios.
- `Editor operativo`: equipos, planes y bitácora, sin gestión de usuarios.
- `Solo visualización`: consulta sin edición.

## Build local

El archivo `app.js` se reconstruye desde fragmentos comprimidos guardados en `src/`.

```bash
node build-app.js
```

La carpeta publicada queda en `dist/`.

## Despliegue Netlify

Netlify usa `netlify.toml`, ejecuta `node build-app.js` y publica `dist/`.
