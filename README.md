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
schemas, and conformance cases. After upgrading, run generator checks and the
conformance runner before merging.

## Conformance

Conformance cases are owned by the AXTP spec repository. Point the runner at the
locked spec checkout and run:

```bash
AXTP_SPEC_PATH=/path/to/axtp scripts/run-conformance.sh
```

The runner writes `conformance-results/result.json`. Required failures exit
nonzero. Optional cases are reported as skipped or passed unless
`CONFORMANCE_STRICT_OPTIONAL=true`; upgrade PR workflows may temporarily use
`CONFORMANCE_ALLOW_INCOMPLETE=true`.

## Automated AXTP Spec Upgrade

This repository is automatically upgraded when the AXTP Spec repository publishes a tag like `spec/vX.Y.Z`.

Automation flow:

1. Receive `axtp_spec_released` repository dispatch.
2. Update `AXTP_SPEC.lock.yaml`.
3. Set runtime/tool version to `X.Y.Z`.
4. Generate code and `generated/axtp_generated_manifest.json`.
5. Open an Upgrade PR.
6. Auto-merge the PR after checks pass.
7. Create tag `vX.Y.Z`.
8. Create a GitHub Release.

AXTP Spec tag: `spec/vX.Y.Z`

Runtime/tool tag: `vX.Y.Z`

Repository settings must allow GitHub Actions to create PRs, enable auto-merge, create tags, and create releases. Configure `AXTP_RUNTIME_AUTOMATION_TOKEN` when PR-created-by-actions workflows must trigger downstream pull_request checks.

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

AXTP Spec updates create automated upgrade PRs. After checks pass, the PR is auto-merged; the main branch workflow then creates the matching `vX.Y.Z` mock server tag, and that tag triggers the GitHub Release.

Each release records mock server version, AXTP Spec tag, AXTP Spec commit,
generator version, and the generated manifest.
