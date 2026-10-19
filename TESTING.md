# SDK verification

Unit tests use fake HTTP responses and no production credentials:

```sh
cd typescript && deno task test:unit
cd python && uv run pytest -m 'not integration'
cd rust && cargo test --locked
```

Run each line from the repository root (or switch back to it between languages).
Check formatting/types with Deno, Ruff/MyPy, and Rustfmt/Clippy respectively.

## Explicit live contract checks

Set `CONVOMEM_API_KEY` and `CONVOMEM_BASE_URL` in a trusted environment, never in
logged command arguments. The base URL includes `/api/v1`; use an isolated local
API/database because these tests create and delete synthetic customer records.
No test silently auto-loads `.env` or defaults its live target to the cloud.

```sh
# From each language directory:
deno task test:integration
uv run pytest tests/integration -q
cargo test --locked --test integration -- --ignored --test-threads=1
```

Without both values, Python and TypeScript explicitly skip/ignore their live
tests. Rust's four live tests are ignored unless opted in, and fail on missing
configuration when opted in. None of those defaults is evidence that a live API
passed. Ordinary client defaults are unchanged for application consumers.

The 11 October isolated RC check used real Express authentication, PostgreSQL,
Qdrant, Redis/pg-boss and hosted MCP. Python passed four live tests; TypeScript
passed 19 live steps; Rust passed four live tests. Runtime OpenAPI paths and
components matched `openapi.json` (25 public paths). Capture remained queued and
embedding was stubbed: this is compatibility/isolation proof, not an extraction
quality or paid-provider benchmark. Dashboard-only export/analytics APIs are
intentionally absent from SDKs. MCP is a separate hosted tool surface, not an
extra REST SDK method.

19 October: handoff destination management (`/handoff/destinations*`) and route
preview (`/handoff/route/preview`) were removed from `openapi.json` and all three
SDKs. They need dashboard agent/org permissions, so every organization API key
received 403. The public spec now has 22 paths and the production server URL;
`routeHandoff` remains. Handoff `narrativeSource` now includes `pending`. The
TypeScript and Python suites pass; the Rust change is not yet compiled here.
