

## Diagnóstico: Meta Pixel no registra eventos

### Posibles causas

1. **Preview vs. dominio publicado**: El preview de Lovable corre dentro de un iframe en `lovable.app`, lo cual puede bloquear scripts de terceros como `fbevents.js`. El Pixel solo funcionará correctamente en la URL publicada (`crea-tu-enlace.lovable.app` o dominio propio).

2. **Problema de ejecución del script**: Actualmente el script se inyecta con `script.innerHTML`, que en algunos navegadores/contextos puede no ejecutar correctamente el código que carga el script externo de Facebook.

### Solución

**Cambio en `src/pages/PublicLanding.tsx`** — Mejorar la inyección del Pixel para garantizar la ejecución:

- Reemplazar el enfoque de `script.innerHTML` por ejecución directa del IIFE en `window` + creación del script externo de `fbevents.js` de forma programática (sin depender de innerHTML).
- Esto es más robusto:

```ts
useEffect(() => {
  if (!page?.meta_pixel_id) return;
  const pixelId = page.meta_pixel_id;

  // Initialize fbq directly
  const w = window as any;
  if (w.fbq) return;
  const n = w.fbq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!w._fbq) w._fbq = n;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];

  // Load external script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  w.fbq('init', pixelId);
  w.fbq('track', 'PageView');

  // noscript fallback
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);

  return () => { ... cleanup };
}, [page?.meta_pixel_id]);
```

### Importante
- **Probar siempre en la URL publicada**, no en el preview de Lovable.
- Verificar con la extensión [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) de Chrome para confirmar que el Pixel se carga.

