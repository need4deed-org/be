#!/bin/sh

# 1. Try to load NVM from the standard install path
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. If nvm was found, tell it to use the project's version
if command -v nvm >/dev/null 2>&1; then
  if [ -f ".nvmrc" ]; then
    # Read the version string from .nvmrc safely
    NODE_VERSION=$(cat .nvmrc | tr -d '\r' | xargs)

    echo "Found .nvmrc, switching to Node $NODE_VERSION..."
    
    # Run 'nvm use' without the unsupported --silent flag, hiding output cross-platform
    nvm use "$NODE_VERSION" >/dev/null 2>&1 || true
  fi
fi