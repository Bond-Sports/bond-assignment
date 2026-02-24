#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID $CLIENT_PID 2>/dev/null
  wait $SERVER_PID $CLIENT_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "Starting API server..."
cd "$ROOT/server"
npm run start:dev &
SERVER_PID=$!

echo "Waiting for API server to be ready..."
until curl -s http://localhost:3000/resources > /dev/null 2>&1; do
  sleep 1
done
echo "API server ready on http://localhost:3000"

echo "Starting client..."
cd "$ROOT/client"
npm run dev &
CLIENT_PID=$!

echo "Client starting on http://localhost:4200"
echo "Press Ctrl+C to stop both."

wait
