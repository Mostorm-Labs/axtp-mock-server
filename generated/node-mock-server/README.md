# Generated AXTP Node Mock Scenario Harness

This generated project uses `@axtp/runtime` from the sibling
`axtp-ts-runtime` repository. It runs a TCP AXTP Standard Framed mock
server on the Node.js backend.

```bash
pnpm install
pnpm build
pnpm smoke
```

By default the server listens on `127.0.0.1:50362`. Override with
`AXTP_MOCK_TCP_HOST` and `AXTP_MOCK_TCP_PORT`.

The default handlers cover `audio.getAlgorithmConfig`,
`audio.getAlgorithmCapabilities`, and `audio.setAlgorithmConfig`.
