FROM node:16-alpine3.15

RUN apk --no-cache add docker docker-compose
COPY . /app
RUN cd app && npm ci --omit=dev
ENTRYPOINT ["node", "/app/src/index.js"]
