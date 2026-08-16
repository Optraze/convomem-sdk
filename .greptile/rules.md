## Three-language parity

This repo ships the same SDK in Python, Rust, and TypeScript. When a PR adds or changes a resource method, endpoint, or error type in one language, check whether the other two need the equivalent change. A single-language change to the shared resource surface (conversations, customers, embed, entities, insights, memories, orgs, webhooks) is often an incomplete PR — flag it, don't assume it's intentional.

## API key handling

Flag any code path that logs, error-messages, or writes to a fixture file the `api_key`/`apiKey` value in plaintext. Test fixtures should use an obviously-fake key (matching the existing `sk-org-test...`/`sk-org-abcdef...` style already in the test suites), never a real-looking or real key.

## Language-specific tooling — don't suggest the wrong package manager

- `python/` uses **uv**, not pip/poetry directly.
- `typescript/` is **Deno-native** (`deno.json`/`deno.lock`) — don't suggest `npm install`/`npm test`; use `deno task`.
- `rust/` is standard Cargo.

## Public API surface

This is a published package (PyPI, crates.io, JSR/npm). A breaking change to a public method signature should come with a version bump in that language's manifest (`pyproject.toml` / `Cargo.toml` / `deno.json`) — flag a signature-breaking change with no version bump.
