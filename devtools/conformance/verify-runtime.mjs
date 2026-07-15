#!/usr/bin/env node
import { verifySelectedNodeRuntime } from "../generators/dist/runtimeSelection.js";

const [nodeMockDir, selectedRuntimePath] = process.argv.slice(2);
if (!nodeMockDir || !selectedRuntimePath) throw new Error("usage: verify-runtime.mjs NODE_MOCK_DIR AXTP_TS_RUNTIME_PATH");
console.log(`Resolved @axtp/runtime: ${verifySelectedNodeRuntime(nodeMockDir, selectedRuntimePath)}`);
