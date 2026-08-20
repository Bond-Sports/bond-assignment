#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT/server"
CLIENT_DIR="$ROOT/client"
SERVER_PORT=3000
CLIENT_PORT=4200
API_HEALTH_URL="http://localhost:${SERVER_PORT}/resources"
SQLITE_BINDING="$SERVER_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
SERVER_READY_TIMEOUT_SECONDS=60
SERVER_PID=""
CLIENT_PID=""

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but was not found on PATH." >&2
    exit 1
  fi
}

cleanup() {
  echo ""
  echo "Shutting down..."
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "$CLIENT_PID" ]]; then
    kill "$CLIENT_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit 0
}

install_deps() {
  local dir="$1"
  echo "Installing dependencies in $(basename "$dir")..."
  npm install --prefix "$dir"
}

ensure_sqlite_bindings() {
  if [[ -f "$SQLITE_BINDING" ]]; then
    return 0
  fi

  echo "Building SQLite native bindings..."
  npm rebuild better-sqlite3 --prefix "$SERVER_DIR"

  if [[ ! -f "$SQLITE_BINDING" ]]; then
    echo "Error: failed to build better-sqlite3 native bindings." >&2
    echo "Install a C++ toolchain (Xcode Command Line Tools on macOS) and re-run ./start.sh." >&2
    exit 1
  fi
}

wait_for_server() {
  local elapsed=0
  until curl -s "$API_HEALTH_URL" >/dev/null 2>&1; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "Error: API server exited before becoming ready." >&2
      exit 1
    fi
    if (( elapsed >= SERVER_READY_TIMEOUT_SECONDS )); then
      echo "Error: timed out waiting for API server on port ${SERVER_PORT}." >&2
      exit 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
}

require_cmd node
require_cmd npm
require_cmd curl
trap cleanup INT TERM

install_deps "$SERVER_DIR"
ensure_sqlite_bindings
install_deps "$CLIENT_DIR"

echo "Starting API server..."
npm run start:dev --prefix "$SERVER_DIR" &
SERVER_PID=$!

echo "Waiting for API server to be ready..."
wait_for_server
echo "API server ready on http://localhost:${SERVER_PORT}"
echo "Swagger docs: http://localhost:${SERVER_PORT}/api"

echo "Starting client..."
npm run dev --prefix "$CLIENT_DIR" &
CLIENT_PID=$!

echo "Client starting on http://localhost:${CLIENT_PORT}"
echo "Press Ctrl+C to stop both."

wait
