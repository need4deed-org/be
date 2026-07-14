FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY . .
RUN yarn build

FROM node:22-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true && yarn cache clean
COPY --from=builder /app/build ./build
COPY public ./build/public
COPY src/data/seeds/fixtures ./build/src/data/seeds/fixtures
CMD ["node", "build/src/data/seeds/run.js"]
