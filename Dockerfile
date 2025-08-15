FROM node:22-slim
ARG DEFAULT_PORT=3000

WORKDIR /app

COPY package.json ./
RUN npm i


COPY prisma ./prisma
RUN npx prisma generate


COPY . .
RUN npm run build

EXPOSE ${DEFAULT_PORT}


# CMD ["npm","run","start"]
CMD sh -c  "npx prisma migrate dev --name init && npm run start"