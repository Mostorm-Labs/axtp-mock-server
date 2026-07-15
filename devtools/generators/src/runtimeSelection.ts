import { realpathSync } from "node:fs";
import path from "node:path";

export function verifySelectedNodeRuntime(nodeMockDir: string, selectedRuntimePath: string): string {
  const resolved = realpathSync(path.join(nodeMockDir, "node_modules/@axtp/runtime"));
  const selected = realpathSync(selectedRuntimePath);
  if (resolved !== selected) {
    throw new Error(`resolved @axtp/runtime ${resolved} does not match AXTP_TS_RUNTIME_PATH ${selected}`);
  }
  return resolved;
}
