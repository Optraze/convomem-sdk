# @optraze/convomem-sdk

TypeScript / JavaScript SDK for the ConvoMem conversational memory API. Works in Deno,
Node.js, Bun and edge runtimes.

## Installation

```bash
# npm / pnpm / yarn
npx jsr add @optraze/convomem-sdk

# bun
bunx jsr add @optraze/convomem-sdk

# deno
deno add jsr:@optraze/convomem-sdk
```

## Usage

`ConvoMem` is the primary client — identity is resolved server-side, so pass whichever
identifier you have.

```ts
import { ConvoMem } from "@optraze/convomem-sdk";

const client = new ConvoMem({ apiKey: process.env.CONVOMEM_API_KEY! });
const alice = { email: "alice@example.com" };

// Recall before you reply
const { context } = await client.lookup("billing question", alice);

// Capture the exchange afterwards
const capture = await client.capture(
  [
    { role: "user", content: "What's my invoice total?" },
    { role: "assistant", content: "It's $49 this month." },
  ],
  alice,
  { channel: "CHAT" },
);

// Capture is asynchronous; poll only when your workflow needs completion.
const status = await client.getCaptureStatus(capture.captureId);
```

### At the start of a call

Before the customer has said why they are calling there is no topic to rank against. Use
`coldOpen()` for a call-opening brief instead — it leads with anything unresolved and runs
without a vector search.

```ts
const brief = await client.coldOpen({ phone: "+14155550101" }, { autoCreate: true });

if (brief.openIssue?.isOpen) {
  console.log(`Still open: ${brief.openIssue.summary}`);
}
```

### At the end of a call

Close the conversation on the final capture rather than in a separate call — that keeps
the transcript write ordered ahead of analysis.

```ts
await client.capture(
  [{ role: "assistant", content: "All sorted — anything else?" }],
  alice,
  { channel: "VOICE", endConversation: true, outcome: "refund_issued" },
);
```

### Transferring to a human

```ts
const route = await client.routeHandoff(alice);

if (route.destination) {
  await telephony.transfer(route.destination.value, route.destination.transferMessage);
}
```

`routeHandoff` never throws on the transfer path — an unknown customer or an internal
failure degrades to the agent's default destination, so read `route.source` to see which
tier answered. Destinations themselves are configured in the dashboard.

## Configuration

```ts
const client = new ConvoMem({
  apiKey: process.env.CONVOMEM_API_KEY!,
  baseUrl: "http://localhost:8000/api/v1", // self-hosted or local API; must end in /api/v1
  timeout: 10_000, // ms (default)
  maxRetries: 3, // retries on 429/5xx (default)
});
```

Keep the API key server-side. For browser widgets, mint short-lived embed tokens with
`createEmbedToken()`.

## Injecting context safely

The `context` string wraps its memory lines in a delimited block marked as unverified
caller statements. Memory content is derived from what callers say, so it is an untrusted
input channel into your prompt — inject the block verbatim rather than re-flattening it,
and enforce authorization for consequential actions inside the tool rather than in the
prompt.

## Documentation

<https://convomem.com/docs/sdk-typescript>
