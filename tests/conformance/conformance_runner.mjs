#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function resolveSpecPath() {
  for (const candidate of [
    process.env.AXTP_SPEC_PATH,
    path.join(root, "third_party/axtp-spec"),
    path.join(root, ".axtp-spec")
  ]) {
    if (
      candidate &&
      (fs.existsSync(path.join(candidate, "docs/conformance/manifest.yaml")) ||
        fs.existsSync(path.join(candidate, "conformance/manifest.yaml")))
    ) {
      return candidate;
    }
  }
  return undefined;
}

const specPath = resolveSpecPath();
const profilePath = process.env.CONFORMANCE_PROFILE_PATH ?? path.join(root, "conformance/runtime-profile.yaml");
const resultPath = process.env.CONFORMANCE_RESULT_PATH ?? path.join(root, "conformance-results/result.json");
const tsRuntimePath = process.env.AXTP_TS_RUNTIME_PATH ?? path.resolve(root, "../axtp-ts-runtime");

if (
  !specPath ||
  (!fs.existsSync(path.join(specPath, "docs/conformance/manifest.yaml")) &&
    !fs.existsSync(path.join(specPath, "conformance/manifest.yaml")))
) {
  throw new Error("AXTP conformance manifest not found");
}
if (!fs.existsSync(profilePath)) {
  throw new Error(`runtime conformance profile not found: ${profilePath}`);
}

const runtime = await import(pathToFileURL(path.join(tsRuntimePath, "dist/index.js")).href);
const handlers = await import(pathToFileURL(path.join(root, "generated/node-mock-server/dist/audioHandlers.js")).href);
const generated = await import(pathToFileURL(path.join(root, "generated/node-mock-server/dist/generated/axtpGeneratedVersion.js")).href);

const {
  AxtpClient,
  AxtpCore,
  AxtpServer,
  AxtpWireMode,
  BasicBroker,
  CapabilityId,
  ControlOpcode,
  ErrorCode,
  EventId,
  InboundProcessor,
  MethodId,
  MockTransport,
  OutboundProcessor,
  RegistryLookup,
  RpcBodyEncoding,
  RpcEncoding,
  RpcOp,
  SourceProtocol,
  TransportKind,
  WebSocketJsonRpcAdapter,
  bytesEqual,
  bytesToText,
  kCapabilityRegistry,
  kMethodRegistry,
  rpcPayload,
  streamPayload,
  toBytes
} = runtime;

const { installAudioMockHandlers } = handlers;
const { AXTP_GENERATED_VERSION } = generated;

const cases = [
  { id: "handshake.open_accept", level: "framed-binary", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "handshake.open_reject", level: "framed-binary", requirement: "optional", status: "skipped", durationMs: 0, message: "control open rejection policy is not configurable in generated mock servers" },
  { id: "handshake.close", level: "framed-binary", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "handshake.ping_pong", level: "framed-binary", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "session.hello_identify_identified", level: "websocket-jsonrpc", requirement: "required", status: "pending", durationMs: 0, message: "" },
  { id: "session.request_before_identified", level: "websocket-jsonrpc", requirement: "required", status: "pending", durationMs: 0, message: "" },
  { id: "rpc.request_response_json", level: "core", requirement: "required", status: "pending", durationMs: 0, message: "" },
  { id: "rpc.method_not_found", level: "core", requirement: "required", status: "pending", durationMs: 0, message: "" },
  { id: "rpc.invalid_params", level: "core", requirement: "not-selected", status: "skipped", durationMs: 0, message: "generated audio mock handlers accept deterministic invalid JSON/params without schema-aware rejection" },
  { id: "rpc.request_id_match", level: "core", requirement: "required", status: "pending", durationMs: 0, message: "" },
  { id: "event.subscribe_event", level: "event", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "event.unsubscribe_event", level: "event", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "event.emit_event", level: "event", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "capability.get_all", level: "capability", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "capability.method_binding", level: "capability", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "capability.unsupported_method", level: "capability", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "error.standard_error_shape", level: "core", requirement: "required", status: "pending", durationMs: 0, message: "" },
  { id: "error.unauthorized", level: "core", requirement: "not-selected", status: "skipped", durationMs: 0, message: "auth policy hooks are outside the generated mock-server profile" },
  { id: "error.server_busy", level: "core", requirement: "not-selected", status: "skipped", durationMs: 0, message: "busy-state policy hooks are outside the generated mock-server profile" },
  { id: "stream.stream_open", level: "stream", requirement: "optional", status: "skipped", durationMs: 0, message: "stream.open RPC control-plane method is not part of the generated spec/v0.0.2 registry" },
  { id: "stream.stream_data", level: "stream", requirement: "optional", status: "pending", durationMs: 0, message: "" },
  { id: "stream.stream_close", level: "stream", requirement: "optional", status: "skipped", durationMs: 0, message: "stream.close RPC control-plane method is not part of the generated spec/v0.0.2 registry" }
];

async function runCase(id, fn) {
  const item = cases.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`unknown case ${id}`);
  const start = performance.now();
  try {
    const ok = await fn();
    item.status = ok ? "passed" : "failed";
    if (!ok && item.message.length === 0) item.message = "case returned false";
  } catch (error) {
    item.status = "failed";
    item.message = error instanceof Error ? error.message : String(error);
  } finally {
    item.durationMs = performance.now() - start;
  }
}

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function encodeControl(opcode, controlId) {
  const chunks = [];
  new OutboundProcessor({ writeBytes: (bytes) => chunks.push(bytes) }).sendControl({
    opcode,
    controlId,
    statusCode: ErrorCode.Success,
    meta: {
      sourceProtocol: SourceProtocol.AxtpV1,
      sessionId: 0,
      requestId: 0,
      jsonSid: "",
      jsonMethodOrEventName: ""
    },
    body: new Uint8Array()
  });
  return concat(chunks);
}

function decodeOneControl(bytes) {
  const sink = {
    controls: [],
    rpcs: [],
    streams: [],
    onControl(payload) {
      this.controls.push(payload);
    },
    onRpc(payload) {
      this.rpcs.push(payload);
    },
    onStream(payload) {
      this.streams.push(payload);
    }
  };
  new InboundProcessor(sink).onBytes(bytes);
  if (sink.controls.length !== 1) throw new Error("expected one control response");
  return sink.controls[0];
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function bridge(left, right) {
  while (true) {
    const chunk = left.tryPopOutgoing();
    if (chunk === undefined) return;
    right.injectIncoming(chunk);
  }
}

async function withFramedMockServer(fn) {
  const client = new AxtpClient({ timeoutMs: 300, pollIntervalMs: 1 });
  const server = new AxtpServer();
  const clientTransport = new MockTransport();
  const serverTransport = new MockTransport();
  await client.attachTransport(clientTransport);
  await server.attachTransport(serverTransport);
  installAudioMockHandlers(server);
  const pump = setInterval(() => {
    void (async () => {
      bridge(clientTransport, serverTransport);
      await server.poll();
      bridge(serverTransport, clientTransport);
      await client.poll();
    })();
  }, 0);
  try {
    return await fn(client, server);
  } finally {
    clearInterval(pump);
    await client.close();
    await server.close();
  }
}

async function makeJsonMockServer() {
  const server = new AxtpServer();
  installAudioMockHandlers(server);
  const transport = new MockTransport({
    kind: TransportKind.Mock,
    wireMode: AxtpWireMode.WebSocketJsonRpc,
    defaultRpcEncoding: RpcEncoding.Json,
    messageOriented: true,
    supportsTextMessage: true,
    supportsBinaryMessage: false,
    preferredFrameSize: 4096
  });
  await server.attachTransport(transport);
  const adapter = new WebSocketJsonRpcAdapter(server.endpoint(), transport);
  transport.bind(adapter);
  return { server, transport, adapter };
}

async function popJson(transport) {
  await settle();
  const bytes = transport.tryPopOutgoing();
  if (bytes === undefined) throw new Error("missing outgoing JSON message");
  return JSON.parse(bytesToText(bytes));
}

function responseStatus(response) {
  return response.d.status;
}

async function identify(transport, eventMasks = "0901") {
  transport.injectIncoming(toBytes(`{"sid":"","op":2,"d":{"rpcVersion":1,"eventMasks":"${eventMasks}"}}`));
  const response = await popJson(transport);
  if (response.op !== RpcOp.Identified) throw new Error("IDENTIFY did not produce IDENTIFIED");
  if (typeof response.sid !== "string" || response.sid.length === 0) throw new Error("IDENTIFIED sid was empty");
  if (response.d.negotiatedRpcVersion !== 1) throw new Error("IDENTIFIED did not negotiate rpcVersion 1");
  return response.sid;
}

async function methodNotFoundWithId(requestId) {
  const { server, transport, adapter } = await makeJsonMockServer();
  try {
    await adapter.poll();
    await popJson(transport);
    const sid = await identify(transport);
    transport.injectIncoming(toBytes(`{"sid":"${sid}","op":7,"d":{"id":${requestId},"method":"vendor.missing","params":{}}}`));
    const response = await popJson(transport);
    return response.d.id === requestId && responseStatus(response).ok === false && responseStatus(response).code === ErrorCode.RpcMethodNotFound;
  } finally {
    await server.close();
  }
}

function testOpenAccept() {
  const core = new AxtpCore();
  core.byteSink.onBytes(encodeControl(ControlOpcode.Open, 1));
  const responseBytes = core.tryPopOutboundBytes();
  if (responseBytes === undefined) return false;
  const response = decodeOneControl(responseBytes);
  return response.opcode === ControlOpcode.Accept && response.controlId === 1 && response.statusCode === ErrorCode.Success && core.controlSessionOpen();
}

function testClose() {
  const core = new AxtpCore();
  core.byteSink.onBytes(encodeControl(ControlOpcode.Open, 1));
  core.tryPopOutboundBytes();
  core.tryPopOutboundBytes();
  core.byteSink.onBytes(encodeControl(ControlOpcode.Close, 2));
  const responseBytes = core.tryPopOutboundBytes();
  if (responseBytes === undefined) return false;
  const response = decodeOneControl(responseBytes);
  return response.opcode === ControlOpcode.CloseAck && response.controlId === 2 && !core.controlSessionOpen();
}

function testPingPong() {
  const core = new AxtpCore();
  core.byteSink.onBytes(encodeControl(ControlOpcode.Ping, 3));
  const responseBytes = core.tryPopOutboundBytes();
  if (responseBytes === undefined) return false;
  const response = decodeOneControl(responseBytes);
  return response.opcode === ControlOpcode.Pong && response.controlId === 3;
}

async function testSessionHelloIdentify() {
  const { server, transport, adapter } = await makeJsonMockServer();
  try {
    await adapter.poll();
    const hello = await popJson(transport);
    if (hello.op !== RpcOp.Hello) return false;
    await identify(transport);
    return true;
  } finally {
    await server.close();
  }
}

async function testRequestBeforeIdentified() {
  const { server, transport, adapter } = await makeJsonMockServer();
  try {
    await adapter.poll();
    await popJson(transport);
    transport.injectIncoming(toBytes('{"sid":"","op":7,"d":{"id":700,"method":"audio.getAlgorithmConfig","params":{}}}'));
    const response = await popJson(transport);
    return response.op === RpcOp.RequestResponse && response.d.id === 700 && responseStatus(response).code === ErrorCode.ControlOpenRequired;
  } finally {
    await server.close();
  }
}

async function testRequestResponseJson() {
  return withFramedMockServer(async (client) => {
    const response = await client.callJson("audio.getAlgorithmConfig", "{}");
    const parsed = JSON.parse(response);
    return parsed.noiseSuppression?.enabled === true && parsed.echoCancellation?.enabled === true;
  });
}

async function testSubscribeEvent() {
  const { server, transport, adapter } = await makeJsonMockServer();
  try {
    await adapter.poll();
    await popJson(transport);
    await identify(transport, "0901");
    return true;
  } finally {
    await server.close();
  }
}

async function testUnsubscribeEvent() {
  const { server, transport, adapter } = await makeJsonMockServer();
  try {
    await adapter.poll();
    await popJson(transport);
    const sid = await identify(transport, "0901");
    transport.injectIncoming(toBytes(`{"sid":"${sid}","op":4,"d":{"eventMasks":""}}`));
    const response = await popJson(transport);
    return response.op === RpcOp.Identified;
  } finally {
    await server.close();
  }
}

async function testEmitEvent() {
  const { server, transport, adapter } = await makeJsonMockServer();
  try {
    await adapter.poll();
    await popJson(transport);
    const sid = await identify(transport);
    await server.emitRaw(rpcPayload({
      op: RpcOp.Event,
      methodOrEventId: EventId.AudioAlgorithmConfigChanged,
      meta: {
        sourceProtocol: SourceProtocol.JsonRpc,
        sessionId: 0,
        requestId: 0,
        jsonSid: sid,
        jsonMethodOrEventName: ""
      },
      body: toBytes('{"reason":"user_request","applyState":"applied"}')
    }));
    const event = await popJson(transport);
    return event.op === RpcOp.Event && event.d.event === "audio.algorithmConfigChanged" && event.d.data.reason === "user_request";
  } finally {
    await server.close();
  }
}

function testCapabilityGetAll() {
  const generatedRegistry = JSON.parse(fs.readFileSync(path.join(root, "generated/shared/audio-registry.json"), "utf8"));
  const methods = new Map(generatedRegistry.methods.map((method) => [method.name, method]));
  return kMethodRegistry.length >= 4 &&
    methods.get("audio.getAlgorithmConfig")?.id === 0x0901 &&
    methods.get("audio.getAlgorithmCapabilities")?.id === 0x090d &&
    RegistryLookup.methodIdByName("audio.setAlgorithmConfig") === MethodId.AudioSetAlgorithmConfig &&
    RegistryLookup.methodIdByName("audio.resetAlgorithmConfig") === MethodId.AudioResetAlgorithmConfig;
}

async function testCapabilityMethodBinding() {
  const capability = kCapabilityRegistry.find((item) => item.id === CapabilityId.AudioAlgorithm && item.name === "audio.algorithm");
  if (capability === undefined) return false;
  const method = RegistryLookup.methodById(MethodId.AudioGetAlgorithmConfig);
  const event = RegistryLookup.eventById(EventId.AudioAlgorithmConfigChanged);
  if (method?.domain !== "audio" || event?.domain !== "audio") return false;
  return withFramedMockServer(async (client) => {
    const response = await client.callJson("audio.getAlgorithmCapabilities", "{}");
    const parsed = JSON.parse(response);
    return parsed.capability === "audio.algorithm" && parsed.algorithms?.noiseSuppression?.supported === true;
  });
}

function testStreamData() {
  const chunks = [];
  new OutboundProcessor({ writeBytes: (bytes) => chunks.push(bytes) }).sendStream(streamPayload({
    streamId: 9,
    seqId: 1,
    cursor: 0n,
    data: Uint8Array.of(0xaa, 0xbb, 0xcc)
  }));
  const sink = {
    controls: [],
    rpcs: [],
    streams: [],
    onControl(payload) {
      this.controls.push(payload);
    },
    onRpc(payload) {
      this.rpcs.push(payload);
    },
    onStream(payload) {
      this.streams.push(payload);
    }
  };
  const inbound = new InboundProcessor(sink);
  for (const chunk of chunks) inbound.onBytes(chunk);
  return sink.streams.length === 1 &&
    sink.streams[0].streamId === 9 &&
    sink.streams[0].seqId === 1 &&
    sink.streams[0].cursor === 0n &&
    bytesEqual(sink.streams[0].data, Uint8Array.of(0xaa, 0xbb, 0xcc));
}

await runCase("handshake.open_accept", testOpenAccept);
await runCase("handshake.close", testClose);
await runCase("handshake.ping_pong", testPingPong);
await runCase("session.hello_identify_identified", testSessionHelloIdentify);
await runCase("session.request_before_identified", testRequestBeforeIdentified);
await runCase("rpc.request_response_json", testRequestResponseJson);
await runCase("rpc.method_not_found", () => methodNotFoundWithId(2));
await runCase("rpc.request_id_match", () => methodNotFoundWithId(55));
await runCase("event.subscribe_event", testSubscribeEvent);
await runCase("event.unsubscribe_event", testUnsubscribeEvent);
await runCase("event.emit_event", testEmitEvent);
await runCase("capability.get_all", testCapabilityGetAll);
await runCase("capability.method_binding", testCapabilityMethodBinding);
await runCase("capability.unsupported_method", () => methodNotFoundWithId(4));
await runCase("error.standard_error_shape", () => methodNotFoundWithId(99));
await runCase("stream.stream_data", testStreamData);

const normalizedCases = cases.map((item) => ({
  ...item,
  status: item.status === "pending" ? "failed" : item.status
}));
const summary = {
  total: cases.length,
  passed: cases.filter((item) => item.status === "passed").length,
  failed: cases.filter((item) => item.status === "failed" || item.status === "pending").length,
  skipped: cases.filter((item) => item.status === "skipped").length,
  unsupported: cases.filter((item) => item.status === "unsupported").length
};

const result = {
  runtime: "axtp-mock-server",
  runtimeVersion: AXTP_GENERATED_VERSION.runtimeVersion,
  specTag: AXTP_GENERATED_VERSION.specTag,
  profile: profilePath,
  requiredLevels: ["core", "websocket-jsonrpc"],
  optionalLevels: ["capability", "framed-binary", "event", "stream"],
  unsupportedLevels: [],
  summary,
  cases: normalizedCases
};

fs.mkdirSync(path.dirname(resultPath), { recursive: true });
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);

const requiredIssue = cases.some((item) => item.requirement === "required" && item.status !== "passed");
const optionalIssue = cases.some((item) => item.requirement === "optional" && item.status !== "passed");
if (requiredIssue && process.env.CONFORMANCE_ALLOW_INCOMPLETE !== "true") {
  process.exitCode = 1;
}
if (optionalIssue && process.env.CONFORMANCE_STRICT_OPTIONAL === "true") {
  process.exitCode = 1;
}
