# AGENTS.md — convomem-sdk

Guidance for AI coding agents (Claude Code, Greptile, Cursor, Copilot, etc.) working in this repository.

## What this repo is

The official ConvoMem client SDKs, in three languages, kept in parity with each other and with `openapi.json` (the API spec — treat it as the source of truth for what each SDK should expose, not something to hand-edit casually):

```
convomem-sdk/
├── openapi.json     # API spec — check new/changed endpoints against this
├── python/          # pip package `convomem` — httpx + pydantic v2, sync + async clients
├── rust/            # crate `convomem` — reqwest + serde + tokio
└── typescript/       # JSR/npm package `@optraze/convomem-sdk` — Deno-native, published for both Deno and npm
```

Each language mirrors the same **public Integration API** surface: capture,
customers, memories, conversations, handoff routing, and embed tokens. Internal
dashboard/admin surfaces such as analytics, exports, request logs, memory
health, provider settings, organization management, entities, insights, and
webhooks do not belong in this repository. **A change to one language's public
surface (new endpoint, new field, new error type) should almost always be
mirrored in the other two** unless there's a language-specific reason not to —
flag a one-language-only change as likely incomplete.

## Python (`python/`)

- Package manager: **uv** (`uv.lock` present) — use `uv run`/`uv sync`, not bare `pip`.
- `src/convomem/_client.py` (sync) and `_async_client.py` (async) — a new method or resource typically needs both.
- Resources live in `src/convomem/resources/*.py`, one file per domain, following `_base.py`'s pattern.
- Types in `_types.py` (pydantic v2 models), errors in `_errors.py`.
```bash
cd python
uv sync --extra dev
uv run pytest
uv run ruff check .
uv run mypy src
```

## Rust (`rust/`)

- `src/` mirrors the same resource split; `reqwest` for HTTP, `serde` for (de)serialization, `thiserror` for the error enum.
```bash
cd rust
cargo test
cargo clippy
```
- Tests use `wiremock` to mock the API — don't make real network calls in unit tests.

## TypeScript (`typescript/`)

- **Deno-native** (`deno.json`, `deno.lock`) — use `deno test`/`deno task`, not `npm test`. Published as `@optraze/convomem-sdk` for both JSR and npm consumers.
- `mod.ts` is the public entrypoint; `deno.json`'s `publish.include`/`exclude` defines exactly what ships — a new public file must be added to `include` or it won't be published.
- `resources/*.ts` mirrors the Python/Rust resource split.
```bash
cd typescript
deno task test              # all tests
deno task test:unit         # unit only, no network
deno task test:integration  # hits a real/mocked API, --allow-read for fixtures
```

## Cross-cutting conventions

- **API key handling**: every language's client takes an `api_key`/`apiKey` — never log it, never include it in an error message's string representation, never write it to a fixture/test-recording file in plaintext (use a placeholder like `sk-org-test...` in tests, matching existing test fixtures).
- Error types should map API error responses (org-scoped `sk-org-` key auth, rate limits, validation errors) consistently across languages — check `_errors.py` (Python), the error enum (Rust), and `errors.ts` (TypeScript) stay conceptually aligned when adding a new API error case.
- This is a published package in all three ecosystems — a breaking change to a public method signature needs a version bump (see each language's own versioning: `pyproject.toml`, `Cargo.toml`, `deno.json`), not a silent change.

## Workflow

1. Check `openapi.json` for the actual API shape before adding/changing a method.
2. Implement in one language, then check whether the other two need the equivalent change.
3. Run that language's test suite; for TypeScript, run both `test:unit` and `test:integration` if touching request/response handling.
