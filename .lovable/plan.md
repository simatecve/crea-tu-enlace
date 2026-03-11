

## Problema: Links no funcionan en Safari iOS

### Causa
`window.open(url, "_blank", "noopener,noreferrer")` es bloqueado por Safari iOS como popup porque se ejecuta **después** de un `await` (la llamada asíncrona a `track-event`). Safari solo permite `window.open` en el contexto síncrono directo del evento de click del usuario.

### Solución en `src/pages/PublicLanding.tsx`

Cambiar `handleClick` para abrir el enlace **primero** (síncronamente) y luego trackear en segundo plano:

```ts
const handleClick = (link: any) => {
  // Open link FIRST — must be synchronous for Safari iOS
  window.open(link.url, "_blank", "noopener,noreferrer");

  // Track asynchronously in background (fire-and-forget)
  supabase.functions.invoke("track-event", {
    body: {
      landing_page_id: page!.id,
      link_id: link.id,
      event_type: "click",
      referrer: document.referrer || null,
    },
  }).catch(() => {});

  // Meta Pixel Lead event
  if (page?.meta_pixel_id && typeof (window as any).fbq === "function") {
    (window as any).fbq("track", "Lead");
  }
};
```

Alternativa adicional: usar `window.location.href = link.url` como fallback si `window.open` retorna `null` (Safari bloquea silenciosamente).

