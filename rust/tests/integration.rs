//! Integration tests for the ConvoMem SDK.
//!
//! Requires explicit CONVOMEM_API_KEY and CONVOMEM_BASE_URL.
//! Opt in with `cargo test --test integration -- --ignored --test-threads=1`.

use convomem::*;

fn client() -> ConvoMemClient {
    let api_key = std::env::var("CONVOMEM_API_KEY").expect("Explicit integration API key required");
    let base_url =
        std::env::var("CONVOMEM_BASE_URL").expect("Explicit integration base URL required");
    ConvoMemClient::builder()
        .api_key(api_key)
        .base_url(base_url)
        .build()
        .unwrap()
}

fn unique_suffix() -> String {
    format!("{}-{}", std::process::id(), chrono_now())
}

#[tokio::test]
#[ignore = "requires explicit integration credentials and target URL"]
async fn test_capture_roundtrip() {
    let client = client();

    let req = CaptureRequest {
        message: Some("Integration test message".to_string()),
        messages: None,
        customer_id: None,
        email: Some(format!("integ-{}@example.com", unique_suffix())),
        phone_number: None,
        user_name: None,
        external_id: None,
        channel: Some("CHAT".to_string()),
        idempotency_key: Some(format!("integ-{}", chrono_now())),
        ..Default::default()
    };

    let resp = client.capture(&req).await.unwrap();
    assert!(!resp.conversation_id.is_empty());
    assert!(!resp.customer_id.is_empty());
}

#[tokio::test]
#[ignore = "requires explicit integration credentials and target URL"]
async fn test_customer_crud() {
    let client = client();
    let suffix = unique_suffix();

    // Create
    let create_req = CustomerCreateRequest {
        name: Some(format!("Test Customer {suffix}")),
        email: Some(format!("test-{suffix}@example.com")),
        phone: None,
        external_id: None,
        metadata: None,
    };
    let customer = client.create_customer(&create_req).await.unwrap();
    assert!(!customer.id.is_empty());

    // Get
    let fetched = client.get_customer(&customer.id).await.unwrap();
    assert_eq!(fetched.id, customer.id);

    // List
    let list = client.list_customers(None, None).await.unwrap();
    // Customer may not appear in list immediately (eventual consistency)
    let _ = list;

    // Update
    let update_req = CustomerUpdateRequest {
        name: Some(format!("Updated {suffix}")),
        ..Default::default()
    };
    let updated = client
        .update_customer(&customer.id, &update_req)
        .await
        .unwrap();
    assert!(updated.name.unwrap().contains("Updated"));

    // Delete
    client.delete_customer(&customer.id).await.unwrap();
}

#[tokio::test]
#[ignore = "requires explicit integration credentials and target URL"]
async fn test_memory_lifecycle() {
    let client = client();
    let suffix = unique_suffix();

    // Create a customer with external_id (required by API)
    let create_req = CustomerCreateRequest {
        name: Some(format!("Memory Test {suffix}")),
        email: None,
        phone: None,
        external_id: Some(format!("mem-test-{suffix}")),
        metadata: None,
    };
    let customer = client.create_customer(&create_req).await.unwrap();

    // List memories (may be empty)
    let memories = client
        .list_memories(&customer.id, None, None)
        .await
        .unwrap();
    println!("Found {} memories", memories.total);

    // Lookup memories
    let ctx = client
        .lookup_memories(
            &customer.id,
            &MemoryLookupParams {
                topic: "preference".to_string(),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    // Context may be empty if no memories exist for this topic
    println!("Memory context length: {}", ctx.context.len());

    // Cleanup
    client.delete_customer(&customer.id).await.unwrap();
}

#[tokio::test]
#[ignore = "requires explicit integration credentials and target URL"]
async fn test_conversation_lifecycle() {
    let client = client();
    let suffix = unique_suffix();

    // Create a customer with email (required by API)
    let create_req = CustomerCreateRequest {
        name: Some(format!("Conv Test {suffix}")),
        email: Some(format!("conv-{suffix}@example.com")),
        phone: None,
        external_id: None,
        metadata: None,
    };
    let customer = client.create_customer(&create_req).await.unwrap();

    // Start conversation
    let conv = client
        .start_conversation(&customer.id, "CHAT")
        .await
        .unwrap();
    assert_eq!(conv.status, "ACTIVE");

    // List conversations
    let list = client
        .list_conversations(&customer.id, None, None)
        .await
        .unwrap();
    assert!(list.conversations.iter().any(|c| c.id == conv.id));

    // Cleanup
    client.delete_customer(&customer.id).await.unwrap();
}

fn chrono_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
