import { describe, expect, it } from "vitest";
import { parseConformanceSelection, validateConformanceResult } from "./conformance.js";

const manifest = `conformance:\n  version: 1.0.0\n  spec_min: spec/v1.0.0\nlevels:\n  core:\n    description: Core\n    required_cases: [rpc.one, rpc.shared]\n  event:\n    description: Event\n    required_cases: [rpc.shared, event.one]\n`;
const profile = `runtime: mock\nspec_min: spec/v1.0.0\nrequired_levels: []\noptional_levels: []\nunsupported_levels: [core, event]\n`;

describe("conformance selection", () => {
  it("parses YAML structurally and deduplicates cross-level cases", () => {
    expect(parseConformanceSelection(manifest, profile).cases).toEqual(["event.one", "rpc.one", "rpc.shared"]);
  });

  it.each([
    ["zero levels", `conformance:\n  version: 1.0.0\n  spec_min: spec/v1.0.0\nlevels: {}`, profile],
    ["zero cases", `conformance:\n  version: 1.0.0\n  spec_min: spec/v1.0.0\nlevels:\n  core:\n    description: Core\n    required_cases: []`, `runtime: mock\nspec_min: spec/v1.0.0\nrequired_levels: []\noptional_levels: []\nunsupported_levels: [core]`],
    ["unknown profile key", manifest, `${profile}extra: true\n`],
    ["overlap", manifest, profile.replace("required_levels: []", "required_levels: [core]")],
    ["unknown level", manifest, profile.replace("unsupported_levels: [core, event]", "unsupported_levels: [core, event, future]")],
    ["missing classification", manifest, profile.replace("[core, event]", "[core]")]
  ])("rejects %s", (_name, manifestSource, profileSource) => {
    expect(() => parseConformanceSelection(manifestSource, profileSource)).toThrow();
  });
});

describe("conformance result validation", () => {
  it("rejects zero cases, additional properties, duplicate ids, and inconsistent summaries", () => {
    const nonnegativeInteger = { type: "integer", minimum: 0 };
    const schema = {
      type: "object",
      required: ["runtime", "runtimeVersion", "specTag", "summary", "cases"],
      additionalProperties: false,
      properties: {
        runtime: { type: "string", minLength: 1 },
        runtimeVersion: { type: "string", minLength: 1 },
        specTag: { type: "string", pattern: "^spec/v[0-9]+\\.[0-9]+\\.[0-9]+$" },
        profile: { type: "string" },
        summary: {
          type: "object",
          required: ["total", "passed", "failed", "skipped"],
          additionalProperties: false,
          properties: {
            total: nonnegativeInteger,
            passed: nonnegativeInteger,
            failed: nonnegativeInteger,
            skipped: nonnegativeInteger,
            unsupported: nonnegativeInteger
          }
        },
        cases: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "status"],
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              status: { type: "string", enum: ["passed", "failed", "skipped", "unsupported"] },
              durationMs: { type: "number", minimum: 0 },
              message: { type: "string" }
            }
          }
        }
      }
    };
    const base = {
      runtime: "mock",
      runtimeVersion: "1.0.0",
      specTag: "spec/v1.0.0",
      summary: { total: 1, passed: 0, failed: 0, skipped: 0, unsupported: 1 },
      cases: [{ id: "rpc.one", status: "unsupported", message: "not implemented" }]
    };
    expect(() => validateConformanceResult(base, schema)).not.toThrow();
    expect(() => validateConformanceResult({ ...base, cases: [], summary: { ...base.summary, total: 0, unsupported: 0 } }, schema)).toThrow(/nonempty/);
    expect(() => validateConformanceResult({ ...base, extra: true }, schema)).toThrow(/additional/);
    expect(() => validateConformanceResult({ ...base, cases: [...base.cases, ...base.cases], summary: { ...base.summary, total: 2, unsupported: 2 } }, schema)).toThrow(/unique/);
    expect(() => validateConformanceResult({ ...base, summary: { ...base.summary, total: 2 } }, schema)).toThrow(/total/);
    expect(() => validateConformanceResult({ ...base, cases: [{ ...base.cases[0], message: "" }] }, schema)).toThrow(/reason/);
  });
});
