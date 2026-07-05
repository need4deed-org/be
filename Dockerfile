FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY . .
RUN yarn build

FROM node:22-alpine AS production

# Note: JWT_SECRET should be provided at runtime via secrets management
# not as build args for security reasons
ARG NODE_ENV=${NODE_ENV:-production}
ARG CDN_BASE_URL
ARG NIDS_TOKEN
ARG RUN_MIGRATIONS=${RUN_MIGRATIONS:-true}
ARG GIT_COMMIT_SHA=${GIT_COMMIT_SHA:-unknown}
ARG NOTIFY_EMAIL_DRY_RUN=false
ARG NOTIFY_SLACK_DRY_RUN=false
ARG SMTP_HOST=mail.infomaniak.com
ARG SMTP_PORT=587

ENV NODE_ENV=${NODE_ENV}
ENV PORT=8000
ENV CDN_BASE_URL=${CDN_BASE_URL}
ENV NIDS_TOKEN=${NIDS_TOKEN}
ENV RUN_MIGRATIONS=${RUN_MIGRATIONS}
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV NOTIFY_EMAIL_DRY_RUN=${NOTIFY_EMAIL_DRY_RUN}
ENV NOTIFY_SLACK_DRY_RUN=${NOTIFY_SLACK_DRY_RUN}
ENV SMTP_HOST=${SMTP_HOST}
ENV SMTP_PORT=${SMTP_PORT}
WORKDIR /app

RUN apk update && apk add --no-cache curl dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true && yarn cache clean

COPY --from=builder /app/build ./build

COPY ca/eu-central-1-bundle.pem ./certificates/eu-central-1-bundle.pem

COPY public ./build/public

# Change ownership of all files to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user AFTER setting all permissions
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health-check || exit 1

EXPOSE 8000

# Use dumb-init to handle signals properly
USER root

RUN cat <<EOF > /usr/local/bin/entrypoint.sh
#!/bin/sh
if [ "\$NODE_ENV" = "production" ]; then
    exec dumb-init -- "\$@"
else
    exec "\$@"
fi
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown nodejs:nodejs /usr/local/bin/entrypoint.sh

USER nodejs

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Start the production server
CMD ["node", "build/src/index.js"]
