#!/bin/sh
if [ "$NODE_ENV" = "production" ]; then
    exec dumb-init -- "$@"
else
    exec "$@"
fi
