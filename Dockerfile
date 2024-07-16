FROM node:alpine AS builder

WORKDIR /tmp/team-peoli-web

COPY package*.json .

RUN npm install --only-dev

COPY . .

RUN npm run build

FROM nginx:1.26-alpine

WORKDIR /usr/src/team-peoli-web

COPY --from=builder /tmp/team-peoli-web/dist .
COPY --from=builder /tmp/team-peoli-web/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
