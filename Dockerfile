FROM node:22.14.0-slim

ARG DEFAULT_PORT=3000

WORKDIR /app 

COPY package.json . 

RUN npm i
COPY . . 

RUN npm run build

EXPOSE ${DEFAULT_PORT}

CMD sh -c  "prisma:generate && npm run start"


