# 🁣 DominoStats Pro

**Plataforma SaaS profesional para gestión de partidas, jugadores y estadísticas avanzadas de dominó y juegos competitivos en equipo.**

## 🚀 Inicio Rápido

1. Abre `index.html` directamente en tu navegador (doble clic o arrastrar)
2. Inicia sesión con las credenciales de demo:
   - **Email:** `admin@demo.com`
   - **Contraseña:** `admin123`

> 💡 No requiere instalación de ningún tipo. Funciona completamente en el navegador.

---

## 📋 Módulos Disponibles

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard** | KPIs en tiempo real, gráficos de actividad, top jugadores, partidas recientes |
| 🎮 **Partidas** | Registro, edición, eliminación y exportación de partidas |
| 👥 **Jugadores** | Gestión de participantes con perfiles detallados y radar chart |
| 🏆 **Rankings** | Tabla de posiciones con pódium animado, ranking por parejas y global |
| 📚 **Historial** | Historial completo con filtros avanzados (jugador, fecha, tipo) |
| 📈 **Estadísticas** | VS head-to-head, rendimiento por día, tendencias, rachas |
| 🔮 **Predictor** | Algoritmo de predicción por efectividad, sinergia y racha reciente |
| 📂 **Importar** | Importación CSV drag-and-drop, backup JSON completo |
| 📋 **Reportes** | Reporte completo con todos los KPIs exportable a CSV |
| ⚙️ **Admin** | Gestión de usuarios, grupos, logs de actividad, configuración |

---

## 🔐 Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| 🛡️ **Admin Global** | Acceso total: todos los grupos, usuarios y estadísticas |
| 👑 **Admin Grupo** | Gestiona su propio grupo: jugadores, partidas, informes |
| 👤 **Usuario** | Solo lectura: puede ver estadísticas e historial |

---

## 📊 Estadísticas Calculadas Automáticamente

- ✅ Victorias / Derrotas / Efectividad (%)
- 📈 Diferencia de puntos acumulada
- 👟 Zapatos propinados y recibidos
- 🔥 Racha actual (victorias/derrotas consecutivas)
- 🏆 Racha máxima histórica
- 🤝 Estadísticas por pareja
- ⚔️ Head-to-Head directo entre jugadores
- 📅 Rendimiento por día de la semana
- 📊 Efectividad rolling (tendencias)

---

## 🔮 Predictor Inteligente

El algoritmo considera:
1. **Efectividad individual** de cada jugador
2. **Sinergia de pareja** (rendimiento histórico juntos)
3. **Forma reciente** (racha actual + – penalización/bonus)
4. **Historial directo** entre los contendientes

---

## 📂 Importación CSV

### Jugadores (`plantilla_players.csv`)
```
nombre,alias,notas
Juan Pérez,Juancho,Jugador veterano
```

### Partidas (`plantilla_matches.csv`)
```
fecha,tipo,jugador1,jugador2,jugador3,jugador4,score1,score2
2025-06-15,amistoso,Juan Pérez,María López,Carlos Ruiz,Ana Torres,200,150
```

---

## 💾 Almacenamiento

Los datos se guardan en **localStorage** del navegador. Para hacer copias de seguridad puedes:
- Exportar backup JSON completo desde **Importar → Backup**
- Restaurar backup con el mismo proceso

---

## 🎨 Diseño

- Modo oscuro y modo claro
- Fuente: Inter (Google Fonts)
- Paleta: violeta (#6C63FF), cyan (#00D4FF), verde (#00E5A0)
- Componentes: Cards glassmorphism, gráficos SVG puros
- Animaciones: fade-in, shimmer, float, chartLine draw

---

## 🛠 Tecnologías

- **HTML5** + **CSS3** (Vanilla, sin frameworks)
- **JavaScript** (ES6+, sin dependencias externas)
- **SVG** para gráficos (pure JS chart engine)
- **localStorage** para persistencia de datos
