import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SpecModel } from "../models.js";
import { emitMockServerFiles } from "./mockServer.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function emitMockProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "axtp-mock-generator-"));
  temporaryDirectories.push(dir);
  const spec = {
    methods: [
      {
        id: 0x0901,
        name: "audio.getAlgorithmConfig",
        domain: "audio",
        requestSchema: "AudioGetAlgorithmConfigRequest",
        responseSchema: "AudioGetAlgorithmConfigResponse"
      }
    ]
  } as SpecModel;
  await emitMockServerFiles(spec, dir);
  return dir;
}

describe("mock-server emitter", () => {
  it("uses the current TypeScript runtime lifecycle and handler APIs", async () => {
    const dir = await emitMockProject();
    const handlers = await readFile(path.join(dir, "node-mock-server/src/audioHandlers.ts"), "utf8");
    const main = await readFile(path.join(dir, "node-mock-server/src/main.ts"), "utf8");

    expect(handlers).toContain("server.handleRaw(");
    expect(handlers).not.toContain("JsonRpcHandler");
    expect(handlers).not.toContain("server.onJson(");
    expect(main).toContain("new AxtpServer(transport, { logicalRole: \"server\" })");
    expect(main).toContain("await server.listen()");
    expect(main).toContain("transport.boundPort");
    expect(main).toContain("shutdownPromise ??=");
    expect(main).toContain("process.exitCode = 1");
    expect(main).not.toContain("attachTransport");
    expect(main).not.toContain("server.poll()");
  });

  it("emits a smoke test for exact routing errors and post-error liveness", async () => {
    const dir = await emitMockProject();
    const smoke = await readFile(path.join(dir, "node-mock-server/src/smoke.ts"), "utf8");

    expect(smoke).toContain("ErrorCode.RpcMethodNotFound");
    expect(smoke).toContain("ErrorCode.NotSupported");
    expect(smoke).toContain('client.callRaw("vendor.missing", {})');
    expect(smoke).toContain('client.callRaw("audio.resetAlgorithmConfig", {})');
    expect(smoke).toContain("assert.equal(client.isReady, true)");
    expect(smoke).toContain("let client: AxtpClient | undefined");
    expect(smoke).toContain("if (client !== undefined) await client.close()");
    expect(smoke).toContain("if (server !== undefined) await server.close()");
    expect(smoke.indexOf("try {")).toBeLessThan(smoke.indexOf("await server.listen()"));
    expect(smoke).not.toContain("callJson");
    expect(smoke).not.toContain("ensureAppReady");
  });
});
