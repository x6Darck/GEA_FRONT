# Etapa de construcción
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos package.json y lockfile
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Construimos la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiamos la configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos estáticos de la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
