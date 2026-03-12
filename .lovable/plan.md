

## Analisis y mejoras del sistema de analiticas

### Como funciona actualmente

1. **Visitas**: Cuando alguien abre una landing page (`PublicLanding.tsx`), se llama a la edge function `track-event` con `event_type: "visit"`. Se registra 1 visita por carga de pagina.

2. **Clicks**: Cuando alguien hace click en un enlace, se llama a `track-event` con `event_type: "click"` y el `link_id`. Un visitante puede generar multiples clicks (uno por cada enlace que toque).

3. **Dashboard**: `Analytics.tsx` trae todos los eventos crudos y calcula las metricas en el frontend.

### Por que hay tanta diferencia entre visitas y clicks

Datos reales de tu base de datos:
- **1,506,222 clicks** totales vs **208,129 visitas** totales (ratio ~7:1)
- Ejemplo: una pagina tiene 374,888 clicks y 42,028 visitas (9 clicks por visita)

Esto es **parcialmente normal** porque cada visitante puede hacer click en varios enlaces. Pero hay dos problemas reales:

### Problemas encontrados

**1. BUG CRITICO: Limite de 1000 filas**
La consulta en `Analytics.tsx` no especifica limite, y la base de datos devuelve maximo 1000 filas por defecto. Con cientos de miles de eventos por pagina, el dashboard muestra datos **completamente incorrectos** -- solo cuenta hasta 1000 eventos en total.

**2. Rendimiento**: Se traen todos los eventos crudos al navegador y se calculan las metricas con JavaScript. Con el volumen de datos que tenes, esto es insostenible.

**3. Clicks perdidos**: El tracking de clicks usa fire-and-forget. Si `window.location.href` se ejecuta como fallback (Safari), la pagina navega antes de que el tracking se complete, perdiendo algunos clicks.

**4. Sin visitantes unicos**: No hay forma de diferenciar si 100 visitas son 100 personas distintas o 1 persona recargando 100 veces.

### Solucion propuesta

**Crear funciones de base de datos (RPCs)** que hagan toda la agregacion server-side, y simplificar el frontend para solo consumir los resultados:

#### 1. Crear 3 funciones RPC via migracion SQL

- `get_analytics_summary(page_id, days)` -- Retorna totales: visitas, clicks, paises unicos, CTR
- `get_analytics_daily(page_id, days)` -- Retorna visitas y clicks agrupados por dia
- `get_analytics_breakdowns(page_id, days)` -- Retorna desglose por dispositivo, navegador, pais, referrer, y clicks por link_id

Estas funciones usan `SECURITY DEFINER` y verifican internamente que el usuario sea dueno de la pagina.

#### 2. Reescribir `Analytics.tsx`

- Reemplazar las 3 queries crudas por llamadas a las RPCs
- Eliminar todo el calculo de metricas en JavaScript
- Mantener la misma UI (cards, graficos, filtros de periodo)

#### 3. Mejorar edge function `track-event`

- Usar `navigator.sendBeacon` en el frontend para clicks (en vez de fetch fire-and-forget), que garantiza que la peticion se envie incluso si la pagina navega. Fallback a fetch si sendBeacon no esta disponible.

### Archivos a modificar
- **Nueva migracion SQL**: 3 funciones RPC para agregacion server-side
- **`src/pages/Analytics.tsx`**: Consumir RPCs en vez de datos crudos
- **`src/pages/PublicLanding.tsx`**: Usar `sendBeacon` para tracking de clicks

