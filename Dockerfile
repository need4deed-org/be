FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY . .
RUN yarn build

FROM node:22-alpine AS production

# Note: JWT_SECRET should be provided at runtime via secrets management
# not as build args for security reasons
ARG NODE_ENV=production
ARG AWS_S3_BASE

ENV NODE_ENV=${NODE_ENV}
ENV PORT=8000
ENV AWS_S3_BASE=${AWS_S3_BASE}
WORKDIR /app

RUN apk update && apk add --no-cache curl dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true && yarn cache clean

COPY --from=builder /app/build ./build

COPY ca/eu-central-1-bundle.pem ./certificates/eu-central-1-bundle.pem

COPY public ./public

# Change ownership of all files to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user AFTER setting all permissions
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health-check || exit 1

EXPOSE 8000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the production server
CMD ["node", "build/src/index.js"]