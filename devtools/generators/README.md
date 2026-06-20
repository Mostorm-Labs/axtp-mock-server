# AXTP Mock Asset Generator

This generator is owned by `axtp-mock-server`. It emits mock scenarios,
conformance fixtures, test vectors, and runnable scenario harnesses built on top
of AXTP runtime repositories.

It consumes the AXTP spec checkout selected by `AXTP_SPEC_PATH`, or
`third_party/axtp-spec` when the environment variable is unset. The checkout must
match `AXTP_SPEC.lock.yaml`.

```bash
export AXTP_SPEC_PATH=/path/to/axtp
pnpm --dir devtools/generators install
pnpm --dir devtools/generators build
pnpm --dir devtools/generators test
pnpm --dir devtools/generators generate:runtime
```

Generated fixtures are written to `fixtures/generated/`, and generated test
vectors are written to `fixtures/test-vectors/`.
