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
            "status": "queued",
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
        idempotency_key: None,
    };

    let resp = client.capture(&req).await.unwrap();
    assert_eq!(resp.conversation_id, "conv_123");
    assert_eq!(resp.customer_id, "cust_456");
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
        }],
        channel: Some("CHAT".to_string()),
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
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "context": "Customer has 3 billing issues",
            "tokenCount": 50,
            "memories": [{"id": "mem_1", "fact": "Had billing issue"}],
        })))
        .mount(&server)
        .await;

    let resp = client.lookup_memories("cust_123", "billing").await.unwrap();
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
        fact: "Prefers dark mode".to_string(),
        category: Some("preference".to_string()),
        importance: Some(0.8),
        memory_type: None,
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

    let resp = client.list_memories("cust_123", Some(1), Some(10)).await.unwrap();
    assert_eq!(resp.memories.len(), 1);
}

#[tokio::test]
async fn test_lookup_feedback() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/memories/lookup-feedback"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "found": true,
            "feedback": {"rating": 5},
            "memories": [{"id": "mem_1", "fact": "Happy customer"}],
        })))
        .mount(&server)
        .await;

    let req = FeedbackLookupRequest {
        email: Some("test@example.com".to_string()),
        ..Default::default()
    };

    let resp = client.lookup_feedback(&req).await.unwrap();
    assert!(resp.found);
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

    let resp = client.list_conversations("cust_123", Some(1), Some(10)).await.unwrap();
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

// ── Entities ─────────────────────────────────────────────

#[tokio::test]
async fn test_list_entities() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/entities"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "entities": [{"id": "ent_1", "name": "Acme", "type": "company"}],
            "page": 1,
            "limit": 10,
            "total": 1,
        })))
        .mount(&server)
        .await;

    let resp = client.list_entities(Some(1), Some(10), None).await.unwrap();
    assert_eq!(resp.entities.len(), 1);
}

#[tokio::test]
async fn test_get_entity() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/entities/ent_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "ent_123",
            "name": "Acme Corp",
            "type": "company",
        })))
        .mount(&server)
        .await;

    let resp = client.get_entity("ent_123").await.unwrap();
    assert_eq!(resp.name, "Acme Corp");
}

#[tokio::test]
async fn test_search_entities() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/entities/search"))
        .and(query_param("query", "Acme"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "entities": [{"id": "ent_1", "name": "Acme Corp", "type": "company"}],
            "page": 1,
            "limit": 10,
            "total": 1,
        })))
        .mount(&server)
        .await;

    let params = EntitySearchParams {
        query: "Acme".to_string(),
        ..Default::default()
    };

    let resp = client.search_entities(&params).await.unwrap();
    assert_eq!(resp.entities.len(), 1);
}

#[tokio::test]
async fn test_get_entity_graph() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/entities/graph"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "nodes": [{"id": "ent_1", "name": "Acme", "type": "company"}],
            "edges": [{"source": "ent_1", "target": "ent_2", "relationship": "works_with"}],
        })))
        .mount(&server)
        .await;

    let resp = client.get_entity_graph(None, None).await.unwrap();
    assert_eq!(resp.nodes.len(), 1);
    assert_eq!(resp.edges.len(), 1);
}

#[tokio::test]
async fn test_delete_entity() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("DELETE"))
        .and(path("/entities/ent_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
        .mount(&server)
        .await;

    client.delete_entity("ent_123").await.unwrap();
}

// ── Orgs ─────────────────────────────────────────────────

#[tokio::test]
async fn test_create_org() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/orgs"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "org_new",
            "name": "Acme Corp",
            "plan": "enterprise",
        })))
        .mount(&server)
        .await;

    let req = OrgCreateRequest {
        name: "Acme Corp".to_string(),
        plan: Some("enterprise".to_string()),
    };

    let resp = client.create_org(&req).await.unwrap();
    assert_eq!(resp.id, "org_new");
}

#[tokio::test]
async fn test_get_org() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/orgs/org_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "org_123",
            "name": "Acme Corp",
        })))
        .mount(&server)
        .await;

    let resp = client.get_org("org_123").await.unwrap();
    assert_eq!(resp.id, "org_123");
}

#[tokio::test]
async fn test_add_org_member() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/orgs/org_123/members"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "uid": "user_456",
            "role": "admin",
        })))
        .mount(&server)
        .await;

    let req = OrgMemberAddRequest {
        uid: "user_456".to_string(),
        role: "admin".to_string(),
    };

    let resp = client.add_org_member("org_123", &req).await.unwrap();
    assert_eq!(resp.role, "admin");
}

#[tokio::test]
async fn test_create_org_api_key() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/orgs/org_123/api-keys"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "key_new",
            "name": "Production",
            "key": "sk-org-abc123",
            "prefix": "sk-org-abc...",
        })))
        .mount(&server)
        .await;

    let req = OrgApiKeyCreateRequest {
        name: Some("Production".to_string()),
    };

    let resp = client.create_org_api_key("org_123", Some(&req)).await.unwrap();
    assert_eq!(resp.key.unwrap(), "sk-org-abc123");
}

#[tokio::test]
async fn test_get_org_audit_logs() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/orgs/org_123/audit-logs"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
            {"id": "log_1", "action": "member.added", "actor": "admin"}
        ])))
        .mount(&server)
        .await;

    let resp = client.get_org_audit_logs("org_123", None, None).await.unwrap();
    assert_eq!(resp.len(), 1);
}

// ── Insights ─────────────────────────────────────────────

#[tokio::test]
async fn test_insights_dashboard() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/insights/dashboard"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "totalCustomers": 100,
            "totalMemories": 500,
            "activeConversations": 10,
        })))
        .mount(&server)
        .await;

    let resp = client.insights_dashboard().await.unwrap();
    assert_eq!(resp.total_customers, Some(100));
}

#[tokio::test]
async fn test_buying_signals() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/insights/buying-signals"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
            {"id": "sig_1", "signal": "Interested in upgrade", "confidence": 0.85}
        ])))
        .mount(&server)
        .await;

    let resp = client.buying_signals(None, None).await.unwrap();
    assert_eq!(resp.len(), 1);
    assert_eq!(resp[0].confidence, Some(0.85));
}

#[tokio::test]
async fn test_frequent_issues() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/insights/frequent-issues"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
            {"issue": "Slow response time", "count": 42, "percentage": 15.5}
        ])))
        .mount(&server)
        .await;

    let resp = client.frequent_issues().await.unwrap();
    assert_eq!(resp.len(), 1);
    assert_eq!(resp[0].count, 42);
}

#[tokio::test]
async fn test_list_insights() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/insights"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "insights": [{"id": "ins_1", "type": "trend", "title": "Rising demand"}],
            "page": 1,
            "limit": 10,
            "total": 1,
        })))
        .mount(&server)
        .await;

    let resp = client.list_insights(Some(1), Some(10), None).await.unwrap();
    assert_eq!(resp.insights.len(), 1);
}

#[tokio::test]
async fn test_act_on_insight() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/insights/ins_123/action"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
        .mount(&server)
        .await;

    let req = InsightActionRequest {
        action: "dismiss".to_string(),
        notes: None,
    };

    client.act_on_insight("ins_123", &req).await.unwrap();
}

// ── Webhooks ─────────────────────────────────────────────

#[tokio::test]
async fn test_create_webhook() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("POST"))
        .and(path("/orgs/org_123/webhooks"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "wh_new",
            "url": "https://example.com/webhook",
            "events": ["conversation.created"],
            "active": true,
        })))
        .mount(&server)
        .await;

    let req = WebhookCreateRequest {
        url: "https://example.com/webhook".to_string(),
        events: Some(vec!["conversation.created".to_string()]),
        secret: None,
    };

    let resp = client.create_webhook("org_123", &req).await.unwrap();
    assert_eq!(resp.id, "wh_new");
}

#[tokio::test]
async fn test_list_webhooks() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("GET"))
        .and(path("/orgs/org_123/webhooks"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
            {"id": "wh_1", "url": "https://example.com/hook", "active": true}
        ])))
        .mount(&server)
        .await;

    let resp = client.list_webhooks("org_123").await.unwrap();
    assert_eq!(resp.len(), 1);
}

#[tokio::test]
async fn test_delete_webhook() {
    let server = MockServer::start().await;
    let client = client(&server.uri());

    Mock::given(method("DELETE"))
        .and(path("/orgs/org_123/webhooks/wh_123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
        .mount(&server)
        .await;

    client.delete_webhook("org_123", "wh_123").await.unwrap();
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
