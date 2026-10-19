# convomem

Async Rust SDK for the ConvoMem conversational memory API.

## Installation

```bash
cargo add convomem
cargo add tokio --features macros,rt-multi-thread
```

## Usage

`ConvoMem` is the primary client — identity is resolved server-side, so pass whichever
identifier you have.

```rust,no_run
use convomem::{ConvoMem, CustomerIdentity, Message};

#[tokio::main]
async fn main() -> convomem::Result<()> {
    let client = ConvoMem::new(std::env::var("CONVOMEM_API_KEY").unwrap());
    let alice = CustomerIdentity::from_email("alice@example.com");

    // Recall before you reply
    let ctx = client.lookup("billing question", &alice, None, None, None).await?;
    println!("{}", ctx.context);

    // Capture the exchange afterwards
    let capture = client
        .capture(
            vec![
                Message { role: "user".into(), content: "What's my invoice total?".into(), ..Default::default() },
                Message { role: "assistant".into(), content: "It's $49 this month.".into(), ..Default::default() },
            ],
            &alice,
            Some("CHAT"),
            None,
            None,
        )
        .await?;

    // Capture is asynchronous; poll only when your workflow needs completion.
    let status = client.get_capture_status(&capture.capture_id).await?;
    println!("{:?}", status.status);
    Ok(())
}
```

### At the start of a call

Before the customer has said why they are calling there is no topic to rank against. Use
`cold_open()` for a call-opening brief instead — it leads with anything unresolved and runs
without a vector search.

```rust,no_run
# use convomem::{ConvoMem, CustomerIdentity};
# async fn f(client: &ConvoMem) -> convomem::Result<()> {
let brief = client
    .cold_open(&CustomerIdentity::from_phone("+14155550101"), Some(true), None, None)
    .await?;

if let Some(issue) = brief.open_issue.filter(|issue| issue.is_open) {
    println!("Still open: {:?}", issue.summary);
}
# Ok(()) }
```

### At the end of a call

Close the conversation on the final capture rather than in a separate call — that keeps
the transcript write ordered ahead of analysis.

```rust,no_run
# use convomem::{CaptureRequest, ConvoMem, Message};
# async fn f(client: &ConvoMem) -> convomem::Result<()> {
client
    .capture_with(&CaptureRequest {
        messages: Some(vec![Message { role: "assistant".into(), content: "All sorted.".into(), ..Default::default() }]),
        phone_number: Some("+14155550101".into()),
        channel: Some("VOICE".into()),
        end_conversation: Some(true),
        outcome: Some("refund_issued".into()),
        ..Default::default()
    })
    .await?;
# Ok(()) }
```

### Transferring to a human

```rust,no_run
# use convomem::{ConvoMem, CustomerIdentity};
# async fn f(client: &ConvoMem) -> convomem::Result<()> {
let route = client
    .route_handoff(&CustomerIdentity::from_email("alice@example.com"), None)
    .await?;

if let Some(destination) = route.destination {
    println!("Transfer to {}", destination.value);
}
# Ok(()) }
```

`route_handoff` never errors on the transfer path — an unknown customer or an internal
failure degrades to the agent's default destination, so read `route.source` to see which
tier answered. Destinations themselves are configured in the dashboard.

## Configuration

```rust,no_run
# fn f() -> convomem::Result<()> {
let client = convomem::ConvoMem::builder()
    .api_key("sk-org-...")
    .base_url("http://localhost:8000/api/v1") // self-hosted or local API
    .build()?;
# Ok(()) }
```

The client does not retry automatically; wrap calls in your own retry policy for `429` and
`5xx` responses. `ConvoMem` is not `Clone` — share one instance through an `Arc`.

## Injecting context safely

The `context` string wraps its memory lines in a delimited block marked as unverified
caller statements. Memory content is derived from what callers say, so it is an untrusted
input channel into your prompt — inject the block verbatim rather than re-flattening it,
and enforce authorization for consequential actions inside the tool rather than in the
prompt.

## Documentation

<https://convomem.com/docs/sdk-rust>
