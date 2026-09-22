# convomem

Python SDK for the ConvoMem conversational memory API.

## Installation

```bash
pip install convomem
```

## Usage

`ConvoMem` is the primary client — identity is resolved server-side, so pass whichever
identifier you have.

```python
from convomem import ConvoMem, CustomerIdentity

client = ConvoMem(api_key="sk-org-abc123")
alice = CustomerIdentity(email="alice@example.com")

# Recall before you reply
ctx = client.lookup("billing question", alice)
print(ctx.context)

# Capture the exchange afterwards
capture = client.capture(
    [
        {"role": "user", "content": "What's my invoice total?"},
        {"role": "assistant", "content": "It's $49 this month."},
    ],
    alice,
    channel="CHAT",
)

# Capture is asynchronous; poll only when your workflow needs completion.
status = client.get_capture_status(capture.capture_id)
```

### At the start of a call

Before the customer has said why they are calling there is no topic to rank against. Use
`cold_open()` for a call-opening brief instead — it leads with anything unresolved and runs
without a vector search.

```python
result = client.cold_open(CustomerIdentity(phone="+14155550101"), auto_create=True)

if result.open_issue:
    print(f"Still open: {result.open_issue.summary}")
```

### At the end of a call

Close the conversation on the final capture rather than in a separate call — that keeps
the transcript write ordered ahead of analysis.

```python
client.capture(
    [{"role": "assistant", "content": "All sorted — anything else?"}],
    alice,
    channel="VOICE",
    end_conversation=True,
    outcome="refund_issued",
)
```

### Transferring to a human

```python
route = client.route_handoff(alice)

if route.destination:
    telephony.transfer(route.destination.value, route.destination.transfer_message)
```

`route_handoff` never raises on the transfer path — an unknown customer or an internal
failure degrades to the agent's default destination, so read `route.source` to see which
tier answered.

## Async

Every method has an `AsyncConvoMem` equivalent with the same signature.

```python
import asyncio
from convomem import AsyncConvoMem, CustomerIdentity

async def main():
    async with AsyncConvoMem(api_key="sk-org-abc123") as client:
        ctx = await client.lookup("billing", CustomerIdentity(email="alice@example.com"))
        print(ctx.context)

asyncio.run(main())
```

## Self-hosted and local APIs

All clients accept a `base_url` ending in `/api/v1`:

```python
client = ConvoMem(
    api_key="sk-org-abc123",
    base_url="http://localhost:8000/api/v1",
)
```

## Injecting context safely

The `context` string wraps its memory lines in a delimited block marked as unverified
caller statements. Memory content is derived from what callers say, so it is an untrusted
input channel into your prompt — inject the block verbatim rather than re-flattening it,
and enforce authorization for consequential actions inside the tool rather than in the
prompt.

## Documentation

<https://convomem.com/docs>
