#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Kill any existing instance on port 8080
fuser -k 8080/tcp 2>/dev/null || true

# Start server
echo "Starting NovaSmart Dashboard Backend..."
python3 server.py
