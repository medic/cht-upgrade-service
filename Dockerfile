FROM node:20-alpine3.22

RUN apk --no-cache add docker docker-cli-compose
COPY . /app
RUN cd app && npm ci --omit=dev
ENTRYPOINT ["node", "/app/src/index.js"]
