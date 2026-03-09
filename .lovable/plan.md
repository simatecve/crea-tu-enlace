

## Problema: Meta Pixel no funciona en dominio personalizado

El código actual inyecta el Pixel correctamente de forma programática, pero hay un problema clave: **React StrictMode** (o navegación SPA) puede causar que el `useEffect` se ejecute dos veces. En la segunda ejecución, `if (w.fbq) return;` hace que se salte toda la inicialización, pero el script ya fue removido por el cleanup de la primera ejecución. Resultado: `fbq` existe como función pero el script externo nunca carga.

### Solución

Reescribir la inyección del Meta Pixel en `src/pages/PublicLanding.tsx` con un enfoque más robusto:

1. **No hacer early return si `fbq` ya existe** — en su lugar, solo evitar re-crear la función, pero siempre asegurar que el script esté en el DOM y que se llame `init` + `track`.

2. **Verificar si el script ya está cargado** antes de añadirlo, usando `document.querySelector('script[src*="fbevents.js"]')`.

3. **Mover la inyección a una función standalone** que no dependa del ciclo de vida de React — ejecutar directamente al tener el pixelId, sin cleanup que remueva el script (el Pixel debe persistir toda la sesión).

```ts
useEffect(() => {
  if (!page?.meta_pixel_id) return;
  const pixelId = page.meta_pixel_id;
  const w = window as any;

  // Initialize fbq queue if not exists
  if (!w.fbq) {
    const n: any = (w.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  }

  // Ensure script is in DOM (don't duplicate)
  if (!document.querySelector('script[src*="fbevents.js"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  // Always call init + track (fbq deduplicates internally)
  w.fbq("init", pixelId);
  w.fbq("track", "PageView");

  // noscript fallback
  if (!document.querySelector('img[src*="facebook.com/tr"]')) {
    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.head.appendChild(noscript);
  }

  // No cleanup — pixel must persist for the session
}, [page?.meta_pixel_id]);
```

### Cambios clave vs. código actual
- **Sin cleanup**: No remover el script al desmontar — esto causaba que el Pixel dejara de funcionar.
- **Sin early return por `fbq` existente**: Siempre llamar `init` y `track`.
- **Deduplicación por querySelector**: Evitar scripts duplicados sin depender del estado de `window.fbq`.

