# Imagen base: Node 20 en su versión "alpine" (más liviana)
FROM node:20-alpine

WORKDIR /app

# Copiamos primero solo el package.json para aprovechar el caché de Docker:
# si las dependencias no cambian, no se vuelve a correr npm install.
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Ahora sí copiamos el resto: el backend y el frontend
# (servidor.js sirve el frontend con express.static(path.join(__dirname, '..', 'frontend')),
# por eso necesita quedar en esa misma posición relativa dentro de la imagen).
COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# El entrypoint arma config.js con las variables de entorno y recién ahí arranca node.
ENTRYPOINT ["./docker-entrypoint.sh"]
