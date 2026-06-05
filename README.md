# AXTP Mock Server

This repository is reserved for the AXTP mock server, scenario scripts, protocol
simulator, and conformance helper.

No standalone mock server implementation was present in the AXTP source
repository during this extraction. The repository now carries the AXTP Spec
dependency contract so future mock server work can bind to the same spec source
of truth as the runtime repositories.

## AXTP Spec Compatibility

This runtime repository implements AXTP Spec from the AXTP main specification
repository when mock server sources are added.

See `AXTP_SPEC.lock.yaml` for:

- AXTP Spec repository
- Spec tag
- Spec version
- Source commit
- Compatibility range

Runtime code must not redefine AXTP protocol semantics. Protocol documents,
registries, schemas, business domains, business flows, and conformance cases are
maintained in the AXTP spec repository.

## AXTP Spec Dependency

Use `AXTP_SPEC_PATH` to point local tooling to a checked out AXTP spec
repository:

```bash
export AXTP_SPEC_PATH=/path/to/axtp
```

The checkout should match the tag and commit recorded in
`AXTP_SPEC.lock.yaml`. Do not depend on the `main` branch for reproducible
runtime builds.

Mock server scenarios and conformance helpers should read schemas, registries,
and conformance cases through `AXTP_SPEC_PATH` or an explicit
`third_party/axtp-spec` checkout.

## Spec Lock Checks

```bash
scripts/check-axtp-spec-lock.sh
```

## Local Generator

This repository maintains its own generator under `generators/`.

```bash
export AXTP_SPEC_PATH=/path/to/axtp
pnpm --dir generators install
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators generate:runtime
```

Generated mock server fixtures are written to `fixtures/generated/` and
`fixtures/test-vectors/`.

To move to a later released spec tag:

```bash
scripts/upgrade-axtp-spec.sh spec/v0.1.0
```
