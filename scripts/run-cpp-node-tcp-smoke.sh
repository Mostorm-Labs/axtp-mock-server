#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_DIR="${ROOT_DIR}/generated/node-mock-server"
CPP_RUNTIME_DIR="${AXTP_CPP_RUNTIME_DIR:-${ROOT_DIR}/../axtp-cpp-runtime}"
BUILD_DIR="${ROOT_DIR}/build/cpp-node-tcp-client"
LOG_FILE="${ROOT_DIR}/build/node-mock-tcp.log"

mkdir -p "${ROOT_DIR}/build"

pnpm --dir "${NODE_DIR}" build

AXTP_MOCK_TCP_HOST="${AXTP_MOCK_TCP_HOST:-127.0.0.1}"
AXTP_MOCK_TCP_PORT="${AXTP_MOCK_TCP_PORT:-0}"
export AXTP_MOCK_TCP_HOST AXTP_MOCK_TCP_PORT

node "${NODE_DIR}/dist/main.js" >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

READY_LINE=""
for _ in $(seq 1 100); do
  if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    cat "${LOG_FILE}" >&2
    exit 1
  fi
  READY_LINE="$(grep -E "AXTP TCP mock server listening on " "${LOG_FILE}" | tail -n 1 || true)"
  if [[ -n "${READY_LINE}" ]]; then
    break
  fi
  sleep 0.05
done

if [[ -z "${READY_LINE}" ]]; then
  cat "${LOG_FILE}" >&2
  echo "Timed out waiting for Node TCP mock server ready line." >&2
  exit 1
fi

PORT="$(sed -E 's/.*:([0-9]+)$/\1/' <<<"${READY_LINE}")"
if [[ -z "${PORT}" || "${PORT}" == "${READY_LINE}" ]]; then
  echo "Could not parse TCP port from ready line: ${READY_LINE}" >&2
  exit 1
fi

cmake -S "${ROOT_DIR}/tests/cpp-node-tcp-client" -B "${BUILD_DIR}" -DAXTP_CPP_RUNTIME_DIR="${CPP_RUNTIME_DIR}"
cmake --build "${BUILD_DIR}"

AXTP_MOCK_TCP_PORT="${PORT}" "${BUILD_DIR}/axtp_cpp_node_tcp_client_smoke"
