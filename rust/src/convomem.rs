//! Primary flat-API client for ConvoMem.
//!
//! Identity routing: when `identity.customer_id` is set the SDK uses the
//! path-based route (`/customers/:id/…`).  Otherwise the flat route is used
//! and the server resolves the customer from `email` / `phone` / `external_id`.

use crate::client::{ConvoMemClient, ConvoMemClientBuilder, QueryParams};
use crate::error::{ConvoMemError, Result};
use crate::types::*;

// ── Identity helpers ──────────────────────────────────────────────────────────

fn identity_body_params(id: &CustomerIdentity) -> Vec<(&'static str, serde_json::Value)> {
    let mut v = Vec::new();
    if let Some(s) = &id.customer_id  { v.push(("customerId",  serde_json::json!(s))); }
    if let Some(s) = &id.external_id  { v.push(("externalId",  serde_json::json!(s))); }
    if let Some(s) = &id.email        { v.push(("email",        serde_json::json!(s))); }
    if let Some(s) = &id.phone        { v.push(("phone",        serde_json::json!(s))); }
    v
}

fn identity_query(id: &CustomerIdentity) -> QueryParams {
    QueryParams::new()
        .push_opt("customerId",  id.customer_id.as_deref())
        .push_opt("externalId",  id.external_id.as_deref())
        .push_opt("email",       id.email.as_deref())
        .push_opt("phone",       id.phone.as_deref())
}

fn merge_into(mut base: serde_json::Value, extra: Vec<(&'static str, serde_json::Value)>) -> serde_json::Value {
    if let Some(obj) = base.as_object_mut() {
        for (k, v) in extra {
            obj.insert(k.to_string(), v);
        }
    }
    base
}

// ── ConvoMem ──────────────────────────────────────────────────────────────────

/// Primary async ConvoMem client with dual-routing identity support.
///
/// # Example
/// ```no_run
/// use convomem::{ConvoMem, CustomerIdentity};
///
/// #[tokio::main]
/// async fn main() {
///     let client = ConvoMem::new("sk-org-your-key");
///
///     // Recall context before generating a reply
///     let ctx = client.lookup(
///         "billing question",
///         &CustomerIdentity::from_email("alice@example.com"),
///         None,
///         None,
///     ).await.unwrap();
///
///     // … generate reply using ctx.context …
///
///     // Capture conversation turns for future recall
///     client.capture(
///         vec![
///             Message { role: "user".into(), content: "What's my invoice?".into() },
///             Message { role: "assistant".into(), content: "Let me look that up…".into() },
///         ],
///         &CustomerIdentity::from_email("alice@example.com"),
///         Some("CHAT"),
///         None,
///         None,
///     ).await.unwrap();
/// }
/// ```
pub struct ConvoMem {
    client: ConvoMemClient,
}

impl ConvoMem {
    /// Create a new client with the given API key and default settings.
    pub fn new(api_key: impl Into<String>) -> Self {
        Self { client: ConvoMemClient::new(api_key) }
    }

    /// Create a builder for custom timeout configuration.
    pub fn builder() -> ConvoMemBuilder {
        ConvoMemBuilder::default()
    }

    // ── A. Capture ───────────────────────────────────────────────────────────

    /// Send conversation turns for background memory extraction.
    ///
    /// Fire-and-forget: returns before extracted facts are searchable.
    /// Send turns verbatim — do not skip or summarise.
    pub async fn capture(
        &self,
        messages: Vec<Message>,
        identity: &CustomerIdentity,
        channel: Option<&str>,
        user_name: Option<&str>,
        idempotency_key: Option<&str>,
    ) -> Result<CaptureResponse> {
        let req = CaptureRequest {
            messages: Some(messages),
            customer_id: identity.customer_id.clone(),
            phone_number: identity.phone.clone(), // /capture uses phoneNumber, not phone
            external_id: identity.external_id.clone(),
            email: identity.email.clone(),
            channel: channel.map(str::to_string),
            user_name: user_name.map(str::to_string),
            idempotency_key: idempotency_key.map(str::to_string),
            ..Default::default()
        };
        self.client.request(reqwest::Method::POST, "/capture", &QueryParams::new(), Some(&req)).await
    }

    // ── B. Recall ────────────────────────────────────────────────────────────

    /// Recall semantically relevant memories and return a prompt-ready context string.
    pub async fn lookup(
        &self,
        topic: &str,
        identity: &CustomerIdentity,
        auto_create: Option<bool>,
        user_name: Option<&str>,
    ) -> Result<MemoryContext> {
        let auto_str = auto_create.map(|v| if v { "true" } else { "false" });

        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}/memories/lookup");
            let query = QueryParams::new()
                .push("topic", topic)
                .push_opt("autoCreate", auto_str)
                .push_opt("userName", user_name);
            self.client.request(reqwest::Method::GET, &path, &query, None::<&()>).await
        } else {
            let query = identity_query(identity)
                .push("topic", topic)
                .push_opt("autoCreate", auto_str)
                .push_opt("userName", user_name);
            self.client.request(reqwest::Method::GET, "/customers/memories/lookup", &query, None::<&()>).await
        }
    }

    /// List all stored memories for a customer with pagination.
    pub async fn list_memories(
        &self,
        identity: &CustomerIdentity,
        page: Option<u32>,
        limit: Option<u32>,
        category: Option<&str>,
    ) -> Result<MemoryListResponse> {
        let extra = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit)
            .push_opt("category", category);

        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}/memories");
            self.client.request(reqwest::Method::GET, &path, &extra, None::<&()>).await
        } else {
            let query = identity_query(identity)
                .push_opt_u32("page", page)
                .push_opt_u32("limit", limit)
                .push_opt("category", category);
            self.client.request(reqwest::Method::GET, "/customers/memories", &query, None::<&()>).await
        }
    }

    // ── C. Manual memory CRUD ────────────────────────────────────────────────

    /// Manually insert a memory (synchronous — available for recall immediately).
    pub async fn add_memory(
        &self,
        content: &str,
        identity: &CustomerIdentity,
        category: Option<&str>,
    ) -> Result<Memory> {
        let mut body = serde_json::json!({ "content": content });
        if let Some(cat) = category {
            body["category"] = serde_json::json!(cat);
        }

        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}/memories");
            self.client.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(&body)).await
        } else {
            let body = merge_into(body, identity_body_params(identity));
            self.client.request(reqwest::Method::POST, "/customers/memories", &QueryParams::new(), Some(&body)).await
        }
    }

    /// Update a memory's content or category. Requires `identity.customer_id`.
    pub async fn update_memory(
        &self,
        memory_id: &str,
        identity: &CustomerIdentity,
        content: Option<&str>,
        category: Option<&str>,
    ) -> Result<Memory> {
        let id = identity.customer_id.as_deref().ok_or_else(|| {
            ConvoMemError::Config("update_memory requires identity.customer_id".into())
        })?;
        let mut body = serde_json::json!({});
        if let Some(c) = content  { body["content"]  = serde_json::json!(c); }
        if let Some(c) = category { body["category"] = serde_json::json!(c); }
        let path = format!("/customers/{id}/memories/{memory_id}");
        self.client.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(&body)).await
    }

    /// Permanently delete a memory. Requires `identity.customer_id`.
    pub async fn delete_memory(
        &self,
        memory_id: &str,
        identity: &CustomerIdentity,
    ) -> Result<()> {
        let id = identity.customer_id.as_deref().ok_or_else(|| {
            ConvoMemError::Config("delete_memory requires identity.customer_id".into())
        })?;
        let path = format!("/customers/{id}/memories/{memory_id}");
        self.client.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>).await?;
        Ok(())
    }

    // ── D. Customer management ───────────────────────────────────────────────

    /// Create a new customer profile.
    pub async fn create_customer(&self, req: &CustomerCreateRequest) -> Result<Customer> {
        self.client.request(reqwest::Method::POST, "/customers", &QueryParams::new(), Some(req)).await
    }

    /// Return a paginated, filterable list of customers.
    pub async fn list_customers(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
        search: Option<&str>,
    ) -> Result<CustomerListResponse> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit)
            .push_opt("search", search);
        self.client.request(reqwest::Method::GET, "/customers", &query, None::<&()>).await
    }

    /// Retrieve a single customer profile. Performs a lookup if no `customer_id`.
    pub async fn get_customer(&self, identity: &CustomerIdentity) -> Result<Customer> {
        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}");
            self.client.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
        } else {
            let query = identity_query(identity);
            let resp: CustomerLookupResponse = self.client
                .request(reqwest::Method::GET, "/customers/lookup", &query, None::<&()>)
                .await?;
            resp.customer.ok_or_else(|| ConvoMemError::Api { status: 404, message: "Customer not found".into() })
        }
    }

    /// Update an existing customer profile.
    pub async fn update_customer(
        &self,
        identity: &CustomerIdentity,
        req: &CustomerUpdateRequest,
    ) -> Result<Customer> {
        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}");
            self.client.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req)).await
        } else {
            // Flat route: merge identity fields into the update body
            let mut body = serde_json::to_value(req).unwrap_or_default();
            for (k, v) in identity_body_params(identity) {
                if let Some(obj) = body.as_object_mut() {
                    obj.insert(k.to_string(), v);
                }
            }
            self.client.request(reqwest::Method::PATCH, "/customers", &QueryParams::new(), Some(&body)).await
        }
    }

    /// Delete a customer and all their conversations and memories. Irreversible.
    pub async fn delete_customer(&self, identity: &CustomerIdentity) -> Result<()> {
        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}");
            self.client.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>).await?;
        } else {
            let query = identity_query(identity);
            self.client.request::<serde_json::Value>(reqwest::Method::DELETE, "/customers", &query, None::<&()>).await?;
        }
        Ok(())
    }

    /// Return profiles flagged as potential duplicates.
    pub async fn list_merge_candidates(&self) -> Result<Vec<MergeCandidate>> {
        self.client.request(reqwest::Method::GET, "/customers/merge-candidates", &QueryParams::new(), None::<&()>).await
    }

    /// Dismiss a duplicate candidate as a false positive.
    pub async fn dismiss_merge_candidate(&self, customer_id: &str, candidate_id: &str) -> Result<()> {
        let path = format!("/customers/{customer_id}/merge-candidates/{candidate_id}/dismiss");
        self.client.request::<serde_json::Value>(reqwest::Method::POST, &path, &QueryParams::new(), Some(&serde_json::json!({}))).await?;
        Ok(())
    }

    /// Return aggregate customer statistics for the organization.
    pub async fn get_stats(&self) -> Result<CustomerStats> {
        self.client.request(reqwest::Method::GET, "/customers/stats", &QueryParams::new(), None::<&()>).await
    }

    // ── E. Conversations ─────────────────────────────────────────────────────

    /// Start an active conversation session.
    pub async fn start_conversation(
        &self,
        identity: &CustomerIdentity,
        channel: &str,
    ) -> Result<Conversation> {
        let body = serde_json::json!({ "channel": channel });

        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}/conversations");
            self.client.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(&body)).await
        } else {
            let body = merge_into(body, identity_body_params(identity));
            self.client.request(reqwest::Method::POST, "/customers/conversations", &QueryParams::new(), Some(&body)).await
        }
    }

    /// Mark a conversation as completed. Capture final turns with `capture()` first.
    pub async fn end_conversation(
        &self,
        conversation_id: Option<&str>,
        identity: &CustomerIdentity,
        outcome: Option<&str>,
    ) -> Result<()> {
        if let (Some(conv_id), Some(cust_id)) = (conversation_id, identity.customer_id.as_deref()) {
            let path = format!("/customers/{cust_id}/conversations/{conv_id}");
            let body = outcome.map(|o| serde_json::json!({ "outcome": o }));
            self.client.request::<serde_json::Value>(reqwest::Method::PATCH, &path, &QueryParams::new(), body.as_ref()).await?;
        } else {
            let mut body = serde_json::json!({});
            for (k, v) in identity_body_params(identity) {
                body[k] = v;
            }
            if let Some(conv_id) = conversation_id { body["conversationId"] = serde_json::json!(conv_id); }
            if let Some(o) = outcome { body["outcome"] = serde_json::json!(o); }
            self.client.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/end", &QueryParams::new(), Some(&body)).await?;
        }
        Ok(())
    }

    /// Escalate a conversation to a human agent.
    pub async fn escalate_conversation(
        &self,
        conversation_id: Option<&str>,
        identity: &CustomerIdentity,
        reason: Option<&str>,
    ) -> Result<()> {
        if let (Some(conv_id), Some(cust_id)) = (conversation_id, identity.customer_id.as_deref()) {
            let path = format!("/customers/{cust_id}/conversations/{conv_id}/escalate");
            let body = reason.map(|r| serde_json::json!({ "reason": r }));
            self.client.request::<serde_json::Value>(reqwest::Method::PATCH, &path, &QueryParams::new(), body.as_ref()).await?;
        } else {
            let mut body = serde_json::json!({});
            for (k, v) in identity_body_params(identity) {
                body[k] = v;
            }
            if let Some(conv_id) = conversation_id { body["conversationId"] = serde_json::json!(conv_id); }
            if let Some(r) = reason { body["reason"] = serde_json::json!(r); }
            self.client.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/escalate", &QueryParams::new(), Some(&body)).await?;
        }
        Ok(())
    }

    /// List a customer's conversations (most recent first).
    pub async fn list_conversations(
        &self,
        identity: &CustomerIdentity,
        page: Option<u32>,
        limit: Option<u32>,
        status: Option<&str>,
    ) -> Result<ConversationListResponse> {
        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}/conversations");
            let query = QueryParams::new()
                .push_opt_u32("page", page)
                .push_opt_u32("limit", limit)
                .push_opt("status", status);
            self.client.request(reqwest::Method::GET, &path, &query, None::<&()>).await
        } else {
            let query = identity_query(identity)
                .push_opt_u32("page", page)
                .push_opt_u32("limit", limit)
                .push_opt("status", status);
            self.client.request(reqwest::Method::GET, "/customers/conversations", &query, None::<&()>).await
        }
    }

    // ── F. Handoff & Embed ───────────────────────────────────────────────────

    /// Generate a cross-channel briefing for the human taking over.
    pub async fn get_handoff(
        &self,
        identity: &CustomerIdentity,
        fresh: Option<bool>,
        narrative: Option<bool>,
    ) -> Result<HandoffResponse> {
        let fresh_str     = fresh.map(|v| if v { "true" } else { "false" });
        let narrative_str = narrative.map(|v| if v { "true" } else { "false" });

        if let Some(id) = &identity.customer_id {
            let path = format!("/customers/{id}/handoff");
            let query = QueryParams::new()
                .push_opt("fresh", fresh_str)
                .push_opt("narrative", narrative_str);
            self.client.request(reqwest::Method::GET, &path, &query, None::<&()>).await
        } else {
            let query = identity_query(identity)
                .push_opt("fresh", fresh_str)
                .push_opt("narrative", narrative_str);
            self.client.request(reqwest::Method::GET, "/customers/handoff", &query, None::<&()>).await
        }
    }

    /// Mint a short-lived read-only embed token for the ConvoMem agent panel.
    pub async fn create_embed_token(
        &self,
        identity: &CustomerIdentity,
        ttl_seconds: Option<u32>,
    ) -> Result<EmbedTokenResponse> {
        let req = EmbedTokenRequest {
            customer_id: identity.customer_id.clone(),
            external_id: identity.external_id.clone(),
            email: identity.email.clone(),
            phone: identity.phone.clone(),
            ttl_seconds,
        };
        self.client.request(reqwest::Method::POST, "/embed/tokens", &QueryParams::new(), Some(&req)).await
    }
}

// ── Builder ───────────────────────────────────────────────────────────────────

/// Builder for [`ConvoMem`].
#[derive(Default)]
pub struct ConvoMemBuilder {
    inner: ConvoMemClientBuilder,
}

impl ConvoMemBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.inner = self.inner.api_key(api_key);
        self
    }

    pub fn timeout(mut self, timeout: std::time::Duration) -> Self {
        self.inner = self.inner.timeout(timeout);
        self
    }

    pub fn build(self) -> Result<ConvoMem> {
        Ok(ConvoMem { client: self.inner.build()? })
    }
}
