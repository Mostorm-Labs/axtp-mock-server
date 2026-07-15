#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  parseConformanceSelection,
  validateConformanceResult
} from "../generators/dist/conformance.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const profilePath = process.env.CONFORMANCE_PROFILE_PATH ?? path.join(root, "devtools/conformance/runtime-profile.yaml");
const resultPath = process.env.CONFORMANCE_RESULT_PATH ?? path.join(root, "conformance-results/result.json");

function resolveConformanceDirectory() {
  for (const candidate of [
    process.env.AXTP_SPEC_PATH,
    path.join(root, "third_party/axtp-spec"),
    path.join(root, ".axtp-spec")
  ]) {
    if (!candidate) continue;
    for (const relative of ["docs/conformance", "conformance"]) {
      const dir = path.join(candidate, relative);
      if (fs.existsSync(path.join(dir, "manifest.yaml"))) return dir;
    }
  }
  throw new Error("AXTP conformance manifest not found");
}

const conformanceDir = resolveConformanceDirectory();
const selection = parseConformanceSelection(
  fs.readFileSync(path.join(conformanceDir, "manifest.yaml"), "utf8"),
  fs.readFileSync(profilePath, "utf8")
);
if (selection.unsupportedLevels.length !== selection.levels.length) {
  throw new Error("generated mock runner requires every classified level to be unsupported");
}
const schema = JSON.parse(fs.readFileSync(
  path.join(conformanceDir, "schemas/conformance-result.schema.json"),
  "utf8"
));
const generated = await import(pathToFileURL(path.join(
  root,
  "generated/node-mock-server/dist/generated/axtpGeneratedVersion.js"
)).href);

const cases = selection.cases.map((id) => ({
  id,
  status: "unsupported",
  durationMs: 0,
  message: "Generated mock conformance execution is disabled until its spec checkout is pinned and the shared harness supports the current public runtime API."
}));
const result = {
  runtime: "axtp-mock-server",
  runtimeVersion: generated.AXTP_GENERATED_VERSION.runtimeVersion,
  specTag: generated.AXTP_GENERATED_VERSION.specTag,
  profile: profilePath,
  summary: {
    total: cases.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    unsupported: cases.length
  },
  cases
};

validateConformanceResult(result, schema);
fs.mkdirSync(path.dirname(resultPath), { recursive: true });
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`AXTP mock conformance: ${cases.length} manifest cases reported unsupported`);
