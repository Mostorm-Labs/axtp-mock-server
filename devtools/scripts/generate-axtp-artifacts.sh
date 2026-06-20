#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
spec="${AXTP_SPEC_PATH:-$root/third_party/axtp-spec}"

if [[ ! -d "$spec/registry" && ! -d "$spec/contract/registry" ]]; then
  echo "AXTP_SPEC_PATH must point to an AXTP spec checkout with registry/ or contract/registry/." >&2
  echo "Current value: $spec" >&2
  exit 1
fi

if [[ ! -f "$root/devtools/generators/dist/sourceLoader.js" ]]; then
  echo "Generator is not built. Run: pnpm --dir devtools/generators build" >&2
  exit 1
fi

AXTP_RUNTIME_ROOT="$root" AXTP_SPEC_ROOT="$spec" node --input-type=module <<'NODE'
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.AXTP_RUNTIME_ROOT;
const specRoot = process.env.AXTP_SPEC_ROOT;

const { loadProtocolSources } = await import(pathToFileURL(path.join(root, "devtools/generators/dist/sourceLoader.js")).href);
const { validateSpec } = await import(pathToFileURL(path.join(root, "devtools/generators/dist/validator.js")).href);
const { emitJsonFiles } = await import(pathToFileURL(path.join(root, "devtools/generators/dist/emitters/json.js")).href);
const { emitMockServerFiles } = await import(pathToFileURL(path.join(root, "devtools/generators/dist/emitters/mockServer.js")).href);
const { emitTestVectorFiles } = await import(pathToFileURL(path.join(root, "devtools/generators/dist/emitters/testVectors.js")).href);

const spec = await loadProtocolSources(specRoot);
for (const message of validateSpec(spec)) console.log(message);

const fixturesDir = path.join(root, "fixtures/generated");
const vectorsDir = path.join(root, "fixtures/test-vectors");
const mockServerDir = path.join(root, "generated");
await Promise.all([
  emitJsonFiles(spec, fixturesDir),
  emitMockServerFiles(spec, mockServerDir),
  emitTestVectorFiles(spec, vectorsDir)
]);
console.log(`[OK] generated fixtures: ${fixturesDir}`);
console.log(`[OK] generated test vectors: ${vectorsDir}`);
console.log(`[OK] generated scenario harnesses: ${mockServerDir}`);
NODE

AXTP_SPEC_PATH="$spec" node "$root/devtools/scripts/axtp-versioning.mjs" generate --runtime-name axtp-mock-server
