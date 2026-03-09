

## Meta Pixel por Landing Page

### Problema
Actualmente no hay forma de asignar un Meta (Facebook) Pixel individual a cada landing page para rastreo de conversiones.

### Solución

**1. Migración de base de datos**
Agregar columna `meta_pixel_id` (text, nullable) a `landing_pages`:
```sql
ALTER TABLE public.landing_pages ADD COLUMN meta_pixel_id text;
```

**2. Editor (`src/pages/Editor.tsx`)**
- Agregar campo de estado `metaPixelId` y un input en el formulario para que el usuario ingrese su Pixel ID de Meta (ej: `123456789`).
- Incluir `meta_pixel_id` en la función `savePage`.

**3. Public Landing (`src/pages/PublicLanding.tsx`)**
- Cuando `page.meta_pixel_id` existe, inyectar el script estándar de Meta Pixel via `useEffect`:
  ```js
  // Inyectar fbq script con el pixel ID de la página
  !function(f,b,e,v,n,t,s){...}
  fbq('init', page.meta_pixel_id);
  fbq('track', 'PageView');
  ```
- Opcionalmente, disparar `fbq('track', 'Lead')` o evento personalizado al hacer clic en un link.

### Flujo del usuario
1. En el editor, el usuario pega su Meta Pixel ID (solo el número).
2. Al guardar, se almacena en `landing_pages.meta_pixel_id`.
3. Al visitar la landing pública, se carga el script de Meta Pixel automáticamente con ese ID.

