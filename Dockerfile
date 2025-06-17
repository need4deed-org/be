FROM node:20-alpine

ARG NODE_ENV
ARG JWT_SECRET

ENV NODE_ENV=${NODE_ENV}
ENV JWT_SECRET=${JWT_SECRET}

WORKDIR /app

RUN apk update && apk add --no-cache curl

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=false

COPY . .

EXPOSE 5000

CMD ["yarn", "dev"]