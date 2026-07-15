import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifySelectedNodeRuntime } from "./runtimeSelection.js";

const temporaryDirectories: string[] = [];
afterEach(async () => Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

describe("selected Node runtime", () => {
  it("fails when the installed package resolves outside AXTP_TS_RUNTIME_PATH", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "axtp-runtime-selection-"));
    temporaryDirectories.push(root);
    const mock = path.join(root, "mock");
    const selected = path.join(root, "selected");
    const other = path.join(root, "other");
    await Promise.all([mkdir(path.join(mock, "node_modules/@axtp"), { recursive: true }), mkdir(selected), mkdir(other)]);
    await symlink(other, path.join(mock, "node_modules/@axtp/runtime"));
    expect(() => verifySelectedNodeRuntime(mock, selected)).toThrow(/does not match AXTP_TS_RUNTIME_PATH/);
  });
});
