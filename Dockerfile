# Backend / CLI
FROM node:20-alpine AS backend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY tsconfig.json ./
COPY src/ ./src/
# Default: run CLI with input/output from /data volume
ENTRYPOINT ["npx", "tsx", "src/index.ts"]
CMD ["/data/input.json", "/data/output.json"]

# Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
