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

## AXTP Spec Upgrade

This mock server follows AXTP Spec via `AXTP_SPEC.lock.yaml`.

To upgrade:

```bash
scripts/upgrade-axtp-spec.sh spec/v0.3.0
scripts/check-axtp-spec-lock.sh
```

Mock server behavior is generated or validated against AXTP Spec registry,
schemas, and conformance cases. After upgrading, run generator checks and any
scenario or conformance tests before merging. TODO: no dedicated mock server
scenario/conformance test script exists yet.

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

The generator also emits runnable mock-server subprojects:

- `generated/node-mock-server/`, based on `axtp-ts-runtime` with the Node.js backend
- `generated/cpp-mock-server/`, based on `axtp-cpp-runtime`

Both generated projects install default audio handlers for
`audio.getAlgorithmConfig`, `audio.getAlgorithmCapabilities`, and
`audio.setAlgorithmConfig`. Runtime repositories remain dependencies only; mock
server product code is generated and maintained in this repository.

To move to a later released spec tag:

```bash
scripts/upgrade-axtp-spec.sh spec/v0.1.0
```

## Versioning

This repository keeps AXTP Spec, mock server, and generated artifact versions
separate:

- AXTP Spec tags use `spec/vX.Y.Z` and are recorded in `AXTP_SPEC.lock.yaml`.
- Mock server releases use `vX.Y.Z`.
- Generated artifact metadata is recorded in `generated/axtp_generated_manifest.json`.

Use `scripts/check-generated-version.sh` to verify that the lock file,
generated manifest, runtime version, and generated constants are aligned.

See `docs/generator/GENERATED_VERSIONING.md` for generator versioning details.

## Release

Mock server releases are created from runtime-style tags:

- Mock server tags: `vX.Y.Z`
- AXTP Spec tags: `spec/vX.Y.Z`

AXTP Spec updates create upgrade PRs. They do not automatically create mock
server releases. A release is created only after maintainers tag this repository
with `vX.Y.Z`.

Each release records mock server version, AXTP Spec tag, AXTP Spec commit,
generator version, and the generated manifest.
