import YAML from "yaml";

type JsonObject = Record<string, unknown>;

function object(value: unknown, name: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as JsonObject;
}

function exactKeys(value: JsonObject, allowed: readonly string[], name: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${name} has unknown keys: ${unknown.join(", ")}`);
}

function stringArray(value: unknown, name: string, allowEmpty = true): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${name} must be ${allowEmpty ? "an" : "a nonempty"} array`);
  }
  if (value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${name} must contain nonempty strings`);
  }
  const result = value as string[];
  if (new Set(result).size !== result.length) throw new Error(`${name} contains duplicates`);
  return result;
}

export interface ConformanceSelection {
  readonly specMin: string;
  readonly cases: string[];
  readonly levels: string[];
  readonly unsupportedLevels: string[];
}

export function parseConformanceSelection(
  manifestSource: string,
  profileSource: string
): ConformanceSelection {
  const manifest = object(YAML.parse(manifestSource), "manifest");
  exactKeys(manifest, ["conformance", "levels"], "manifest");
  const conformance = object(manifest.conformance, "manifest.conformance");
  exactKeys(conformance, ["version", "spec_min"], "manifest.conformance");
  if (typeof conformance.version !== "string" || typeof conformance.spec_min !== "string") {
    throw new Error("manifest conformance version and spec_min must be strings");
  }
  const levels = object(manifest.levels, "manifest.levels");
  const levelNames = Object.keys(levels);
  if (levelNames.length === 0) throw new Error("manifest levels must be nonempty");

  const caseIds = new Set<string>();
  for (const levelName of levelNames) {
    const level = object(levels[levelName], `manifest.levels.${levelName}`);
    exactKeys(level, ["description", "required_cases"], `manifest.levels.${levelName}`);
    if (typeof level.description !== "string" || level.description.length === 0) {
      throw new Error(`manifest.levels.${levelName}.description must be nonempty`);
    }
    for (const id of stringArray(level.required_cases, `manifest.levels.${levelName}.required_cases`, false)) {
      caseIds.add(id);
    }
  }
  if (caseIds.size === 0) throw new Error("manifest cases must be nonempty");

  const profile = object(YAML.parse(profileSource), "profile");
  exactKeys(
    profile,
    ["runtime", "spec_min", "required_levels", "optional_levels", "unsupported_levels"],
    "profile"
  );
  if (typeof profile.runtime !== "string" || profile.runtime.length === 0) {
    throw new Error("profile.runtime must be nonempty");
  }
  if (profile.spec_min !== conformance.spec_min) {
    throw new Error(`profile spec_min ${String(profile.spec_min)} does not match manifest ${conformance.spec_min}`);
  }
  const classifications = {
    required: stringArray(profile.required_levels, "profile.required_levels"),
    optional: stringArray(profile.optional_levels, "profile.optional_levels"),
    unsupported: stringArray(profile.unsupported_levels, "profile.unsupported_levels")
  };
  const classified = [...classifications.required, ...classifications.optional, ...classifications.unsupported];
  if (new Set(classified).size !== classified.length) throw new Error("profile level classifications overlap");
  const unknown = classified.filter((level) => !levelNames.includes(level));
  if (unknown.length > 0) throw new Error(`profile classifies unknown levels: ${unknown.join(", ")}`);
  const missing = levelNames.filter((level) => !classified.includes(level));
  if (missing.length > 0) throw new Error(`profile does not classify levels: ${missing.join(", ")}`);

  return {
    specMin: conformance.spec_min,
    cases: [...caseIds].sort(),
    levels: [...levelNames].sort(),
    unsupportedLevels: classifications.unsupported
  };
}

export function validateJsonSchema(value: unknown, schemaValue: unknown, at = "result"): void {
  const schema = object(schemaValue, `${at} schema`);
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || !schema.enum.includes(value))) {
    throw new Error(`${at} is not an allowed value`);
  }
  if (schema.type === "object") {
    const item = object(value, at);
    const properties = object(schema.properties, `${at} schema.properties`);
    for (const key of (schema.required as unknown[] | undefined) ?? []) {
      if (typeof key !== "string" || !(key in item)) throw new Error(`${at} missing ${String(key)}`);
    }
    if (schema.additionalProperties === false) {
      const extras = Object.keys(item).filter((key) => !(key in properties));
      if (extras.length > 0) throw new Error(`${at} has additional properties: ${extras.join(", ")}`);
    }
    for (const [key, child] of Object.entries(item)) {
      if (properties[key] !== undefined) validateJsonSchema(child, properties[key], `${at}.${key}`);
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) throw new Error(`${at} must be an array`);
    for (const [index, item] of value.entries()) validateJsonSchema(item, schema.items, `${at}[${index}]`);
  } else if (schema.type === "string") {
    if (typeof value !== "string") throw new Error(`${at} must be a string`);
    if (typeof schema.minLength === "number" && value.length < schema.minLength) throw new Error(`${at} is too short`);
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) throw new Error(`${at} does not match pattern`);
  } else if (schema.type === "integer") {
    if (!Number.isInteger(value)) throw new Error(`${at} must be an integer`);
    if (typeof schema.minimum === "number" && (value as number) < schema.minimum) throw new Error(`${at} is below minimum`);
  } else if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${at} must be a number`);
    if (typeof schema.minimum === "number" && value < schema.minimum) throw new Error(`${at} is below minimum`);
  } else if (schema.type !== undefined) {
    throw new Error(`${at} schema has unsupported type ${String(schema.type)}`);
  }
}

export function validateConformanceResult(resultValue: unknown, schema: unknown): void {
  validateJsonSchema(resultValue, schema);
  const result = resultValue as JsonObject;
  const cases = result.cases as JsonObject[];
  if (cases.length === 0) throw new Error("result cases must be nonempty");
  const ids = cases.map((item) => item.id as string);
  if (new Set(ids).size !== ids.length) throw new Error("result case ids must be unique");
  const summary = result.summary as Record<string, number>;
  if (summary.total !== cases.length) throw new Error("summary.total does not match cases length");
  for (const status of ["passed", "failed", "skipped", "unsupported"] as const) {
    const count = cases.filter((item) => item.status === status).length;
    if ((summary[status] ?? 0) !== count) throw new Error(`summary.${status} does not match cases`);
  }
  for (const item of cases) {
    if (item.status === "unsupported" && (typeof item.message !== "string" || item.message.length === 0)) {
      throw new Error(`unsupported case ${String(item.id)} requires a reason`);
    }
  }
}
