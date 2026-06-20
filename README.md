# AXTP Mock Scenarios

This repository owns AXTP mock scenarios, conformance helpers, and generated
fixtures. It does not implement an AXTP protocol runtime or define a separate
server framework; runtime repositories provide the server/client APIs and
transports.

Generated Node.js and C++ mock projects in this repository are runnable
scenario harnesses built on top of `axtp-ts-runtime` and `axtp-cpp-runtime`.
They exist to exercise spec-defined behavior, produce reusable fixtures, and
verify conformance across runtime implementations.

## Scope

This repository is responsible for:

- mock scenario definitions and generated scenario handlers
- generated fixtures under `fixtures/generated/`
- generated test vectors under `fixtures/test-vectors/`
- conformance runner glue and runtime profiles
- generated runnable harnesses under `generated/`

This repository is not responsible for:

- AXTP protocol semantics
- transport implementations
- core server/client runtime APIs
- business domain protocol ownership

## AXTP Spec Compatibility

Mock scenarios and generated fixtures follow AXTP Spec from the AXTP main
specification repository.

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

Mock scenarios, generated fixtures, and conformance helpers should read schemas,
registries, and conformance cases through `AXTP_SPEC_PATH` or an explicit
`third_party/axtp-spec` checkout.

## Spec Lock Checks

```bash
scripts/check-axtp-spec-lock.sh
```

## AXTP Spec Upgrade

This mock scenario repository follows AXTP Spec via `AXTP_SPEC.lock.yaml`.

To upgrade:

```bash
scripts/upgrade-axtp-spec.sh spec/v0.3.0
scripts/check-axtp-spec-lock.sh
```

Mock scenario behavior is generated or validated against AXTP Spec registry,
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
3. Set mock asset package release version to `X.Y.Z.0`.
4. Generate code and `generated/axtp_generated_manifest.json`.
5. Open an Upgrade PR.
6. Auto-merge the PR after checks pass.
7. Create tag `vX.Y.Z.0`.
8. Create a GitHub Release.

AXTP Spec tag: `spec/vX.Y.Z`

Mock asset package tag: `vX.Y.Z.0`

Repository settings must allow GitHub Actions to create PRs, enable auto-merge, create tags, and create releases. Configure `AXTP_RUNTIME_AUTOMATION_TOKEN` when PR-created-by-actions workflows must trigger downstream pull_request checks.

## Local Generator

This repository maintains its own mock asset generator under `generators/`.

```bash
export AXTP_SPEC_PATH=/path/to/axtp
pnpm --dir generators install
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators generate:runtime
```

Generated fixtures are written to `fixtures/generated/` and generated test
vectors are written to `fixtures/test-vectors/`.

The generator also emits runnable mock scenario harnesses:

- `generated/node-mock-server/`, based on `axtp-ts-runtime` with the Node.js backend
- `generated/cpp-mock-server/`, based on `axtp-cpp-runtime`

Both generated projects install default audio handlers for
`audio.getAlgorithmConfig`, `audio.getAlgorithmCapabilities`, and
`audio.setAlgorithmConfig`. Runtime repositories remain dependencies only; the
scenario handlers, fixtures, and conformance glue are generated and maintained
in this repository.

To move to a later released spec tag:

```bash
scripts/upgrade-axtp-spec.sh spec/v0.1.0
```

## Versioning

This repository keeps AXTP Spec, mock asset package, and generated artifact
versions separate:

- AXTP Spec tags use `spec/vX.Y.Z` and are recorded in `AXTP_SPEC.lock.yaml`.
- Mock asset package releases use `vX.Y.Z.R`, with `R=0` for the first release from a spec tag.
- Generated artifact metadata is recorded in `generated/axtp_generated_manifest.json`.

Use `scripts/check-generated-version.sh` to verify that the lock file,
generated manifest, repository version, and generated constants are aligned.

See `docs/generator/GENERATED_VERSIONING.md` for generator versioning details.

## Release

Mock asset package releases are created from repository release tags:

- Mock asset package tags: `vX.Y.Z.R`
- AXTP Spec tags: `spec/vX.Y.Z`

AXTP Spec updates create automated upgrade PRs. After checks pass, the PR is auto-merged; the main branch workflow then creates the matching `vX.Y.Z.0` mock asset package tag, and that tag triggers the GitHub Release.

Each release records mock asset package version, AXTP Spec tag, AXTP Spec
commit, generator version, and the generated manifest.
