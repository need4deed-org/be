FROM node:20-alpine

WORKDIR /app

RUN apk update && apk add --no-cache curl

RUN curl https://api.need4deed.org/sanity/

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=false

COPY . .

EXPOSE 5000

CMD ["yarn", "dev"]