//! Integration tests for the ConvoMem SDK.
//!
//! Reads CONVOMEM_API_KEY from .env (auto-discovered via dotenvy) or environment.
//! Skips gracefully if no key is found.

use convomem::*;

fn client() -> Option<ConvoMemClient> {
    let _ = dotenvy::dotenv();
    let api_key = std::env::var("CONVOMEM_API_KEY").ok()?;
    Some(
        ConvoMemClient::builder()
            .api_key(api_key)
            .build()
            .unwrap(),
    )
}

macro_rules! require_client {
    () => {
        match client() {
            Some(c) => c,
            None => {
                eprintln!("SKIP: CONVOMEM_API_KEY not set, skipping integration test");
                return;
            }
        }
    };
}

fn unique_suffix() -> String {
    format!("{}-{}", std::process::id(), chrono_now())
}

#[tokio::test]
async fn test_capture_roundtrip() {
    let client = require_client!();

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
    };

    let resp = client.capture(&req).await.unwrap();
    assert!(!resp.conversation_id.is_empty());
    assert!(!resp.customer_id.is_empty());
}

#[tokio::test]
async fn test_customer_crud() {
    let client = require_client!();
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
    let updated = client.update_customer(&customer.id, &update_req).await.unwrap();
    assert!(updated.name.unwrap().contains("Updated"));

    // Delete
    client.delete_customer(&customer.id).await.unwrap();
}

#[tokio::test]
async fn test_memory_lifecycle() {
    let client = require_client!();
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

    // Add a memory
    // Note: POST /customers/:id/memories is not implemented in the API yet
    // The TS SDK has an add() method but it returns 404
    // We can only test list and lookup

    // List memories (may be empty)
    let memories = client.list_memories(&customer.id, None, None).await.unwrap();
    println!("Found {} memories", memories.total);

    // Lookup memories
    let ctx = client.lookup_memories(&customer.id, "preference").await.unwrap();
    // Context may be empty if no memories exist for this topic
    println!("Memory context length: {}", ctx.context.len());


    // Cleanup
    client.delete_customer(&customer.id).await.unwrap();
}

#[tokio::test]
async fn test_conversation_lifecycle() {
    let client = require_client!();
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
    let conv = client.start_conversation(&customer.id, "CHAT").await.unwrap();
    assert_eq!(conv.status, "ACTIVE");

    // List conversations
    let list = client.list_conversations(&customer.id, None, None).await.unwrap();
    assert!(list.conversations.iter().any(|c| c.id == conv.id));

    // Cleanup
    client.delete_customer(&customer.id).await.unwrap();
}

#[tokio::test]
async fn test_insights_dashboard() {
    let client = require_client!();
    // This endpoint requires elevated permissions - just verify it doesn't panic
    match client.insights_dashboard().await {
        Ok(dashboard) => {
            println!("Dashboard: customers={:?}, memories={:?}", dashboard.total_customers, dashboard.total_memories);
        }
        Err(ConvoMemError::Api { status: 403, .. }) => {
            eprintln!("SKIP: insights dashboard requires elevated permissions");
        }
        Err(e) => panic!("Unexpected error: {e}"),
    }
}

#[tokio::test]
async fn test_entity_operations() {
    let client = require_client!();
    // This endpoint may not exist yet - just verify it doesn't panic
    match client.list_entities(None, None, None).await {
        Ok(entities) => {
            println!("Found {} entities", entities.total);
        }
        Err(ConvoMemError::Api { status: 404, .. }) => {
            eprintln!("SKIP: entities endpoint not available");
        }
        Err(e) => panic!("Unexpected error: {e}"),
    }
}

fn chrono_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
