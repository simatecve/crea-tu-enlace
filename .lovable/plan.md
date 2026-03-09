

## Plan de Mejoras: Eliminar páginas, íconos de redes sociales y rediseño de login

### 1. Eliminar mini landing desde el Dashboard

Agregar un boton de eliminar en cada tarjeta del dashboard con dialogo de confirmacion (AlertDialog).

- Al confirmar, se elimina la landing page (los enlaces y eventos se eliminaran en cascada si hay FK, o manualmente).
- Se usa el componente `AlertDialog` ya disponible en el proyecto.
- Texto en espanol: "¿Eliminar esta pagina?", "Esta accion no se puede deshacer", etc.

**Archivos a modificar:** `src/pages/Dashboard.tsx`

---

### 2. Selector de tipo de enlace con iconos de redes sociales

En el Editor, al agregar/editar un enlace, incluir un selector de "tipo" que detecta automaticamente o permite elegir entre opciones predefinidas de redes sociales:

- **Tipos disponibles:** Instagram, TikTok, YouTube, Twitter/X, Facebook, WhatsApp, Telegram, Spotify, LinkedIn, GitHub, Sitio web (generico)
- Al seleccionar un tipo, se guarda el icono correspondiente en el campo `icon` del enlace
- En la vista previa y en la pagina publica, se muestra el icono SVG correspondiente junto al titulo del enlace
- Se usaran iconos SVG inline (simples, sin dependencias extra) para las redes sociales ya que Lucide no tiene iconos de marcas

**Archivos a modificar:** `src/pages/Editor.tsx`, `src/pages/PublicLanding.tsx`  
**Archivo nuevo:** `src/components/SocialIcon.tsx` (componente con los SVGs de cada red social)

---

### 3. Rediseno de la pagina de Login (dos columnas con fondo animado)

Transformar la pagina de autenticacion en un layout de dos columnas:

- **Columna izquierda:** Fondo con gradiente animado (CSS puro, usando keyframes para mover gradientes de colores suaves). Incluye un titulo grande tipo branding ("Crea tus enlaces, comparte tu mundo") y algunos elementos decorativos con CSS.
- **Columna derecha:** El formulario actual de login/registro, limpio y centrado.
- **En movil:** El fondo animado se oculta y solo se muestra el formulario a pantalla completa.

**Archivos a modificar:** `src/pages/Auth.tsx`, `src/index.css` (agregar keyframes para la animacion del gradiente)

---

### 4. Mejoras visuales generales

- **Dashboard:** Tarjetas con hover suave (shadow + scale), mejor espaciado, badges de estado mas estilizados, header con mas presencia.
- **Editor:** Bordes mas suaves, mejor organizacion visual de secciones, color pickers mas compactos.
- **Paleta de colores:** Actualizar los CSS variables del tema para un look mas moderno: primary mas vibrante (azul-violeta), bordes mas sutiles, sombras suaves.

**Archivos a modificar:** `src/index.css`, `src/pages/Dashboard.tsx`

---

### Detalles Tecnicos

**Base de datos:** No se necesitan cambios en el esquema. El campo `icon` ya existe en la tabla `links` y se usara para guardar el tipo de red social (ej: "instagram", "whatsapp").

**Eliminacion de paginas:** La eliminacion se hara con DELETE desde el cliente. Se necesitara eliminar primero los enlaces y eventos asociados manualmente si no hay cascada, o confiar en las politicas RLS existentes que permiten DELETE al dueno.

**Componente SocialIcon:** Mapa de nombre a SVG path inline. Aproximadamente 12 iconos de redes sociales populares. Se renderizan como `<svg>` inline para evitar dependencias externas.

**Animacion del login:** Keyframes CSS con `background-position` animado sobre un `linear-gradient` multi-color. Sin JavaScript, puro CSS.

