# GEA - Frontend Platform

GEA (Gestión de Eventos y Anuncios) es la plataforma frontend desarrollada en **React** para la administración institucional de calendarios, eventos, espacios físicos y anuncios públicos.

## 🚀 Tecnologías Principales

- **React 19**
- **Vite** (Build Tool)
- **Shadcn/UI & Lucide Icons** (Sistema de Diseño)
- **Axios** (Cliente HTTP)
- **React Router DOM** (Enrutamiento)

## 📁 Estructura del Proyecto

```text
GEA_FRONT/
├── public/              # Archivos estáticos
├── src/
│   ├── assets/          # Recursos gráficos
│   ├── components/      # Componentes UI reutilizables
│   ├── context/         # Estados globales (AuthContext)
│   ├── hooks/           # Custom React Hooks
│   ├── pages/           # Vistas principales (Login, Eventos, Anuncios, etc.)
│   ├── services/        # Integración con APIs
│   └── utils/           # Utilidades y validaciones
├── .env.example         # Variables de entorno requeridas
├── package.json         # Dependencias
└── vite.config.js       # Configuración de Vite
```

## 🛠️ Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/x6Darck/GEA_FRONT.git
   cd GEA_FRONT
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example` y define la URL del backend:
   ```env
   VITE_API_URL=http://localhost:8083
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   El frontend estará disponible en `http://localhost:5173`.

## 📦 Compilación para Producción

Para generar los archivos estáticos listos para producción:
```bash
npm run build
```
Esto creará una carpeta `dist/` que puede ser servida mediante Nginx, Apache o cualquier servicio de hosting estático.

## 🛡️ Buenas Prácticas y Linting

El proyecto sigue estándares estrictos de codificación. Para verificar el código antes de subir cambios:
```bash
npm run lint
```
