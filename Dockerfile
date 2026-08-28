FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev
COPY backend/ ./
EXPOSE 5000
CMD ["node", "server.js"]
