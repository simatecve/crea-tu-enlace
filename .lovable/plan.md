

## Tracking de visitantes únicos

### Enfoque: Cookie `visitor_id`

Usar una cookie persistente con un UUID generado en el frontend. Es simple, no requiere fingerprinting (que tiene problemas legales/éticos), y funciona bien para diferenciar nuevos vs recurrentes.

### Cambios necesarios

#### 1. Migración SQL: agregar columna `visitor_id` a `analytics_events`

```sql
ALTER TABLE analytics_events ADD COLUMN visitor_id text;
```

Y actualizar las RPCs:
- `get_analytics_summary`: agregar `unique_visitors` (COUNT DISTINCT visitor_id WHERE event_type='visit')
- `get_analytics_breakdowns`: agregar sección `new_vs_returning` — visitantes cuyo primer evento fue en el periodo vs los que ya existían antes

#### 2. Frontend (`PublicLanding.tsx`): generar/leer cookie `visitor_id`

Al cargar la página, verificar si existe una cookie `_vid`. Si no, generar un UUID con `crypto.randomUUID()` y guardarla con `max-age` de 1 año. Enviar el `visitor_id` en el body del `track-event`.

#### 3. Edge function (`track-event/index.ts`): guardar `visitor_id`

Recibir el campo `visitor_id` del body y guardarlo en la columna nueva.

#### 4. Dashboard (`Analytics.tsx`): mostrar visitantes únicos

- Agregar card "Visitantes únicos" en el summary
- Agregar card "Nuevos vs Recurrentes" en breakdowns

### Archivos a modificar
- **Nueva migración SQL**: columna + actualización de RPCs
- **`supabase/functions/track-event/index.ts`**: aceptar y guardar `visitor_id`
- **`src/pages/PublicLanding.tsx`**: generar cookie y enviar `visitor_id`
- **`src/pages/Analytics.tsx`**: mostrar visitantes únicos y nuevos vs recurrentes

