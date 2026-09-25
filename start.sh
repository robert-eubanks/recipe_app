#!/bin/sh
# Starts the backend and frontend dev servers together.
# Ctrl+C stops both.

cd "$(dirname "$0")"

npm run backend | sed 's/^/[backend] /' &
BACKEND_PID=$!

npm run frontend | sed 's/^/[frontend] /' &
FRONTEND_PID=$!

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' INT TERM EXIT

wait $BACKEND_PID $FRONTEND_PID
