FROM node:alpine

WORKDIR /app
COPY dist /app/dist

ENV PORT=3000
ENV HOST=localhost

CMD ["node", "./dist/server.js"]