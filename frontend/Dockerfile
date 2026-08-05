# --- Stage 1: build the React app ---
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: serve with Nginx ---
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
