FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Dev stage: Vite dev server with hot reload, used by docker compose.
# Source comes from a bind mount, so no COPY here.
FROM deps AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS builder

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
