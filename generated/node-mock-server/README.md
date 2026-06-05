# Generated AXTP Node Mock Server

This generated project uses `@axtp/runtime` from the sibling
`axtp-ts-runtime` repository. It runs the generated mock server on the
Node.js backend.

```bash
pnpm install
pnpm build
pnpm smoke
```

The default handlers cover `audio.getAlgorithmConfig`,
`audio.getAlgorithmCapabilities`, and `audio.setAlgorithmConfig`.
