use convomem::*;
use wiremock::matchers::{header, method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn client(base_url: &str) -> ConvoMemClient {
    ConvoMemClient::builder()
        .api_key("test-api-key")
        .base_url(base_url)
        .build()
        .unwrap()
}

// ── Capture ──────────────────────────────────────────────

#[tokio::test]
async fn test_capture() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/capture"))
        .and(header("X-API-Key", "test-api-key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "conversationId": "conv_123",
            "customerId": "cust_456",
            "captureId": "cap_789",
            "captureStatus": "queued",
            "status": "active",
            "isNewCustomer": false,
            "isNewConversation": false,
        })))
        .mount(&server)
        .await;

    let req = CaptureRequest {
        message: Some("Hello".to_string()),
        messages: None,
        customer_id: Some("cust_456".to_string()),
        email: None,
        phone_number: None,
        user_name: None,
        external_id: None,
        channel: Some("CHAT".to_string()),
        // Spread the rest so adding a request field is not a test break.
        ..Default::default()
    };

    let resp = client.capture(&req).await.unwrap();
    assert_eq!(resp.conversation_id, "conv_123");
    assert_eq!(resp.customer_id, "cust_456");
}

#[tokio::test]
async fn test_capture_status() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/capture/cap_789"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "captureId": "cap_789",
            "status": "completed",
            "createdAt": "2026-09-22T00:00:00Z",
            "startedAt": null,
            "completedAt": "2026-09-22T00:00:01Z",
            "attempts": 1
        })))
        .mount(&server)
        .await;

    let resp = client.get_capture_status("cap_789").await.unwrap();
    assert_eq!(resp.status, "completed");
}

// ── Customers ────────────────────────────────────────────

#[tokio::test]
async fn test_lookup_customer() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/lookup"))
        .and(query_param("email", "test@example.com"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "found": true,
            "customer": {
                "id": "cust_123",
                "name": "Test User",
                "email": "test@example.com",
            },
            "context": "Some context",
            "tokenCount": 10,
            "memories": [],
        })))
        .mount(&server)
        .await;

    let params = CustomerLookupParams {
        email: Some("test@example.com".to_string()),
        ..Default::default()
    };

    let resp = client.lookup_customer(&params).await.unwrap();
    assert!(resp.found);
    assert_eq!(resp.customer.as_ref().unwrap().id, "cust_123");
}

#[tokio::test]
async fn test_create_customer() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/customers"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "cust_new",
            "name": "New Customer",
            "email": "new@example.com",
        })))
        .mount(&server)
        .await;

    let req = CustomerCreateRequest {
        name: Some("New Customer".to_string()),
        email: Some("new@example.com".to_string()),
        phone: None,
        external_id: None,
        metadata: None,
    };

    let resp = client.create_customer(&req).await.unwrap();
    assert_eq!(resp.id, "cust_new");
}

#[tokio::test]
async fn test_list_customers() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "customers": [{"id": "cust_1", "name": "Alice"}],
            "page": 1,
            "limit": 10,
            "total": 1,
        })))
        .mount(&server)
        .await;

    let resp = client.list_customers(Some(1), Some(10)).await.unwrap();
    assert_eq!(resp.customers.len(), 1);
    assert_eq!(resp.total, 1);
}

#[tokio::test]
async fn test_get_customer() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/cust_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "cust_123",
            "name": "Test User",
        })))
        .mount(&server)
        .await;

    let resp = client.get_customer("cust_123").await.unwrap();
    assert_eq!(resp.id, "cust_123");
}

#[tokio::test]
async fn test_delete_customer() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("DELETE"))
        .and(path("/customers/cust_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
        .mount(&server)
        .await;

    client.delete_customer("cust_123").await.unwrap();
}

// ── Handoff ──────────────────────────────────────────────

#[tokio::test]
async fn test_handoff() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/handoff"))
        .and(query_param("customerId", "cust_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "found": true,
            "customer": {"id": "cust_123", "name": "Test User"},
            "journey": [],
            "keyMemories": [],
            "sentimentTrend": {"direction": "positive", "current": 0.8},
            "openIssue": {"isOpen": false},
        })))
        .mount(&server)
        .await;

    let params = HandoffParams {
        customer_id: Some("cust_123".to_string()),
        ..Default::default()
    };

    let resp = client.handoff(&params).await.unwrap();
    assert!(resp.found);
    assert_eq!(resp.customer.as_ref().unwrap().id, "cust_123");
}

// ── Memories ─────────────────────────────────────────────

#[tokio::test]
async fn test_ingest_memories() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/customers/cust_123/memories/ingest"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "captureId": "cap_456",
            "status": "queued",
        })))
        .mount(&server)
        .await;

    let req = MemoryIngestRequest {
        messages: vec![Message {
            role: "user".to_string(),
            content: "I prefer email".to_string(),
            ..Default::default()
        }],
        channel: Some("CHAT".to_string()),
        language: None,
        infer: None,
        speaker_id: None,
        speaker_name: None,
    };

    let resp = client.ingest_memories("cust_123", &req).await.unwrap();
    assert_eq!(resp.capture_id, "cap_456");
}

#[tokio::test]
async fn test_lookup_memories() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/cust_123/memories/lookup"))
        .and(query_param("topic", "billing"))
        .and(query_param("maxTokens", "400"))
        .and(query_param("explain", "true"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "context": "Customer has 3 billing issues",
            "tokenCount": 50,
            "memories": [{"id": "mem_1", "fact": "Had billing issue"}],
        })))
        .mount(&server)
        .await;

    let resp = client
        .lookup_memories(
            "cust_123",
            &MemoryLookupParams {
                topic: "billing".to_string(),
                max_tokens: Some(400),
                explain: Some(true),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    assert_eq!(resp.token_count, 50);
    assert_eq!(resp.memories.len(), 1);
}

#[tokio::test]
async fn test_add_memory() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/customers/cust_123/memories"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "mem_new",
            "fact": "Prefers dark mode",
            "category": "preference",
        })))
        .mount(&server)
        .await;

    let req = MemoryAddRequest {
        content: "Prefers dark mode".to_string(),
        category: Some("preference".to_string()),
        importance: Some(0.8),
        memory_type: None,
        expires_at: None,
    };

    let resp = client.add_memory("cust_123", &req).await.unwrap();
    assert_eq!(resp.id, "mem_new");
}

#[tokio::test]
async fn test_list_memories() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/cust_123/memories"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "memories": [{"id": "mem_1", "fact": "Test fact"}],
            "page": 1,
            "limit": 10,
            "total": 1,
        })))
        .mount(&server)
        .await;

    let resp = client
        .list_memories("cust_123", Some(1), Some(10))
        .await
        .unwrap();
    assert_eq!(resp.memories.len(), 1);
}

// ── Conversations ────────────────────────────────────────

#[tokio::test]
async fn test_start_conversation() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/customers/cust_123/conversations"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "conv_new",
            "channel": "CHAT",
            "status": "ACTIVE",
        })))
        .mount(&server)
        .await;

    let resp = client.start_conversation("cust_123", "CHAT").await.unwrap();
    assert_eq!(resp.id, "conv_new");
    assert_eq!(resp.status, "ACTIVE");
}

#[tokio::test]
async fn test_list_conversations() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/cust_123/conversations"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "conversations": [{"id": "conv_1", "channel": "CHAT", "status": "ACTIVE"}],
            "page": 1,
            "limit": 10,
            "total": 1,
        })))
        .mount(&server)
        .await;

    let resp = client
        .list_conversations("cust_123", Some(1), Some(10))
        .await
        .unwrap();
    assert_eq!(resp.conversations.len(), 1);
}

// ── Embed ────────────────────────────────────────────────

#[tokio::test]
async fn test_create_embed_token() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/embed/tokens"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "token": "embed_abc123",
            "expiresIn": 3600,
            "scope": "customer",
        })))
        .mount(&server)
        .await;

    let req = EmbedTokenRequest {
        customer_id: Some("cust_123".to_string()),
        external_id: None,
        email: None,
        phone: None,
        ttl_seconds: None,
    };

    let resp = client.create_embed_token(&req).await.unwrap();
    assert_eq!(resp.token, "embed_abc123");
}

// ── Error Handling ───────────────────────────────────────

#[tokio::test]
async fn test_api_error() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/customers/nonexistent"))
        .respond_with(ResponseTemplate::new(404).set_body_string("Customer not found"))
        .mount(&server)
        .await;

    let err = client.get_customer("nonexistent").await.unwrap_err();
    match err {
        ConvoMemError::Api { status, message } => {
            assert_eq!(status, 404);
            assert!(message.contains("Customer not found"));
        }
        _ => panic!("Expected API error"),
    }
}

#[tokio::test]
async fn test_config_error() {
    let result = ConvoMemClient::builder().build();
    assert!(result.is_err());
    match result.unwrap_err() {
        ConvoMemError::Config(msg) => assert!(msg.contains("api_key")),
        _ => panic!("Expected config error"),
    }
}
