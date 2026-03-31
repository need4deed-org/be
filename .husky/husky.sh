#!/bin/sh

# 1. Try to load NVM from the standard install path
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. If nvm was found, tell it to use the project's version
if command -v nvm >/dev/null 2>&1; then
  if [ -f ".nvmrc" ]; then
    nvm use --silent
  fi
fi
