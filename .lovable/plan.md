

## Minimizar consumo de Cloud + Panel de consumo

### Diagnóstico actual

| Métrica | Valor |
|---------|-------|
| Total eventos | 2,027,869 |
| Tamaño tabla analytics_events | 794 MB + 77 MB índice |
| Eventos/día | ~15,000-27,000 |
| Índices útiles | Ninguno (solo pkey) |
| Columna user_agent | ~231 bytes promedio por fila (inútil, ya se extraen device/browser) |

**Principales costos**: tamaño de DB (870MB), invocaciones edge function (~20K/día), y RPCs haciendo full table scans sin índices.

---

### Optimizaciones (sin cambiar funcionalidades)

#### 1. Tabla de resúmenes diarios + purga de datos viejos

Crear tabla `analytics_daily_agg` con datos pre-agregados por día, página, device, browser, country, referrer y link_id. Crear una edge function `aggregate-events` que:
- Agrupe eventos raw de hace más de 3 días en la tabla de resúmenes
- Elimine los eventos raw ya agregados
- Se puede ejecutar manualmente o con un cron (pg_cron no está disponible, se invoca desde el dashboard)

Las RPCs se actualizan para combinar datos de ambas tablas (raw recientes + agregados históricos).

**Impacto estimado**: De 794MB a ~50MB (reducción del 94%) una vez purgados los datos viejos.

#### 2. Deduplicar visitas en edge function

Antes de insertar un evento "visit", verificar si el mismo `visitor_id` ya visitó esa `landing_page_id` en los últimos 30 minutos. Si sí, skip.

**Impacto**: ~30-50% menos inserciones de visitas.

#### 3. Agregar índice compuesto

```sql
CREATE INDEX idx_ae_page_date_type ON analytics_events(landing_page_id, created_at, event_type);
```

**Impacto**: RPCs pasan de full table scan a index scan. Consultas 100x más rápidas.

#### 4. Dejar de almacenar user_agent

Ya se extraen `device` y `browser` del user_agent. Dejar de guardar el texto completo (231 bytes/fila promedio).

**Impacto**: ~460MB menos de datos almacenados (230 bytes × 2M filas).

#### 5. Filtrar bots en edge function

Detectar bots comunes (Googlebot, bingbot, etc.) y no registrar sus visitas.

**Impacto**: Variable, pero evita inflar datos con tráfico no humano.

---

### Panel de consumo en Dashboard

Agregar una pestaña "Consumo" en el Dashboard (junto a "Mis Páginas") que muestre:

- **Eventos totales** y tamaño estimado de la DB
- **Eventos por día** (últimos 7 días)  
- **Desglose por página** (cuáles generan más eventos)
- **Estimación de costos mensuales** basada en: invocaciones edge function, tamaño DB, y egress

Se implementa con un RPC `get_cloud_usage` que consulta conteos y `pg_total_relation_size`.

---

### Archivos a modificar/crear

1. **Migración SQL**: tabla `analytics_daily_agg`, índice compuesto, RPC `get_cloud_usage`, actualizar RPCs existentes para leer de ambas tablas
2. **`supabase/functions/track-event/index.ts`**: deduplicar visitas, filtrar bots, no guardar user_agent
3. **`supabase/functions/aggregate-events/index.ts`**: nueva edge function para agregar y purgar datos viejos
4. **`src/pages/Dashboard.tsx`**: agregar pestaña/sección "Consumo" con cards de uso y costos
5. **`src/App.tsx`**: sin cambios (consumo se muestra dentro del Dashboard existente)

