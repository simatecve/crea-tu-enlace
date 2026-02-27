

## Sistema de Mini Landings (estilo Linktree)

### Descripción General
Sistema completo donde los usuarios se registran, crean múltiples mini landing pages personalizables con enlaces, y obtienen analíticas avanzadas de cada una. Estilo moderno y minimalista, todo en español, sin landing page pública — el sistema inicia directamente en login/registro.

---

### 1. Autenticación (Login / Registro)
- Pantalla inicial con formulario de **registro** e **inicio de sesión** con email y contraseña
- Opción de recuperar contraseña
- Interfaz limpia y centrada, en español
- Redirección al dashboard tras iniciar sesión

### 2. Dashboard Principal
- Lista de todas las mini landings del usuario con vista de tarjetas
- Información rápida: nombre, slug, cantidad de visitas, estado (activa/inactiva)
- Botón para **crear nueva mini landing**
- Acceso rápido a editar o ver analíticas de cada una

### 3. Editor de Mini Landing
- **Información básica**: título, descripción, slug personalizable (ej: `/mi-pagina`)
- **Personalización visual**:
  - Color de fondo o imagen de fondo
  - Avatar/foto de perfil
  - Colores de botones y textos
  - Estilo de botones (redondeados, cuadrados, con/sin borde)
- **Gestión de enlaces**:
  - Agregar, editar, eliminar y reordenar enlaces
  - Cada enlace con título, URL e ícono opcional
  - Activar/desactivar enlaces individualmente
- **Vista previa en tiempo real** del resultado

### 4. Mini Landing Pública
- Accesible por URL con slug personalizado (ej: `tudominio.com/mi-pagina`)
- Muestra avatar, título, descripción y lista de enlaces con los estilos personalizados
- Diseño responsivo optimizado para móvil
- Cada click en enlace y visita se registra para analíticas

### 5. Analíticas Avanzadas
- **Visitas totales** a la mini landing (últimos 7 y 30 días)
- **Clicks por enlace** con ranking de los más populares
- **Datos del visitante**: país/ciudad, dispositivo, navegador, referrer
- **Gráficas temporales** de visitas y clicks por día
- Todo presentado con gráficas claras usando Recharts

### 6. Backend (Lovable Cloud / Supabase)
- Autenticación con Supabase Auth
- Base de datos para: perfiles, mini landings, enlaces, eventos de analíticas
- Edge function para registrar visitas/clicks sin autenticación (las páginas públicas)
- RLS para que cada usuario solo acceda a sus propios datos
- Storage para imágenes de avatar y fondos

### 7. Diseño
- Estilo **moderno y minimalista**: fondo claro, tipografía limpia, bordes suaves
- Completamente **responsivo** (móvil primero)
- Todo el texto e interfaz en **español**

