use std::time::Duration;

use crate::error::{ConvoMemError, Result};
use crate::types::*;

const DEFAULT_BASE_URL: &str = "https://api.convomem.com/api/v1";
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

/// ConvoMem API client.
///
/// # Example
/// ```no_run
/// use convomem::ConvoMemClient;
///
/// #[tokio::main]
/// async fn main() {
///     let client = ConvoMemClient::new("your-api-key");
///     let resp = client.capture(&convomem::CaptureRequest {
///         message: Some("Hello".into()),
///         ..Default::default()
///     }).await.unwrap();
/// }
/// ```
#[derive(Debug, Clone)]
pub struct ConvoMemClient {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
}

/// Helper to build query parameter lists without manual string formatting.
///
/// Collects `(key, value)` pairs and skips entries where value is `None`.
/// Passed to `reqwest::RequestBuilder::query()` which handles percent-encoding.
struct QueryParams(Vec<(&'static str, String)>);

impl QueryParams {
    fn new() -> Self {
        Self(Vec::new())
    }

    fn push(mut self, key: &'static str, value: &str) -> Self {
        self.0.push((key, value.to_string()));
        self
    }

    fn push_opt(mut self, key: &'static str, value: Option<&str>) -> Self {
        if let Some(v) = value {
            self.0.push((key, v.to_string()));
        }
        self
    }

    fn push_opt_u32(self, key: &'static str, value: Option<u32>) -> Self {
        self.push_opt(key, value.map(|v| v.to_string()).as_deref())
    }

    fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    fn as_slice(&self) -> Vec<(&str, &str)> {
        self.0.iter().map(|(k, v)| (*k, v.as_str())).collect()
    }
}

impl ConvoMemClient {
    /// Create a new client with default settings (30s timeout, production URL).
    ///
    /// For custom configuration, use [`ConvoMemClient::builder()`].
    pub fn new(api_key: impl Into<String>) -> Self {
        Self::builder()
            .api_key(api_key)
            .timeout(DEFAULT_TIMEOUT)
            .build()
            .expect("failed to build default HTTP client")
    }

    /// Create a builder for custom client configuration.
    pub fn builder() -> ConvoMemClientBuilder {
        ConvoMemClientBuilder::default()
    }

    /// Execute an HTTP request and deserialize the response.
    ///
    /// Handles auth headers, JSON body serialization, error responses,
    /// and empty-body (204) responses.
    async fn request<T: serde::de::DeserializeOwned>(
        &self,
        method: reqwest::Method,
        path: &str,
        query: &QueryParams,
        body: Option<&impl serde::Serialize>,
    ) -> Result<T> {
        let url = format!("{}{}", self.base_url, path);

        let mut req = self
            .http
            .request(method, &url)
            .header("X-API-Key", &self.api_key);

        if !query.is_empty() {
            req = req.query(&query.as_slice());
        }

        if let Some(body) = body {
            req = req.json(body);
        }

        let res = req.send().await?;

        if !res.status().is_success() {
            let status = res.status().as_u16();
            let text = res.text().await.unwrap_or_default();
            return Err(ConvoMemError::Api {
                status,
                message: text,
            });
        }

        let text = res.text().await?;
        if text.is_empty() {
            return Ok(serde_json::from_str("{}")?);
        }
        Ok(serde_json::from_str(&text)?)
    }

    // ── Capture ─────────────────────────────────────────

    /// Capture a message or conversation for memory extraction.
    ///
    /// Sends user messages to be processed and stored as memories.
    /// Returns a capture ID for tracking async processing.
    pub async fn capture(&self, req: &CaptureRequest) -> Result<CaptureResponse> {
        self.request(reqwest::Method::POST, "/capture", &QueryParams::new(), Some(req))
            .await
    }

    // ── Customers ───────────────────────────────────────

    /// Look up a customer by identity (email, phone, external ID, or customer ID).
    ///
    /// Returns the customer record along with memory context if found.
    pub async fn lookup_customer(&self, params: &CustomerLookupParams) -> Result<CustomerLookupResponse> {
        let query = QueryParams::new()
            .push_opt("customerId", params.customer_id.as_deref())
            .push_opt("phone", params.phone.as_deref())
            .push_opt("email", params.email.as_deref())
            .push_opt("externalId", params.external_id.as_deref())
            .push_opt("topic", params.topic.as_deref())
            .push_opt("autoCreate", params.auto_create.as_deref())
            .push_opt("userName", params.user_name.as_deref());
        self.request(reqwest::Method::GET, "/customers/lookup", &query, None::<&()>).await
    }

    /// Create a new customer record.
    pub async fn create_customer(&self, req: &CustomerCreateRequest) -> Result<Customer> {
        self.request(reqwest::Method::POST, "/customers", &QueryParams::new(), Some(req))
            .await
    }

    /// List customers with pagination.
    pub async fn list_customers(&self, page: Option<u32>, limit: Option<u32>) -> Result<CustomerListResponse> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/customers", &query, None::<&()>).await
    }

    /// Get a single customer by ID.
    pub async fn get_customer(&self, id: &str) -> Result<Customer> {
        let path = format!("/customers/{id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Update an existing customer.
    pub async fn update_customer(&self, id: &str, req: &CustomerUpdateRequest) -> Result<Customer> {
        let path = format!("/customers/{id}");
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req)).await
    }

    /// Delete a customer and all associated data.
    pub async fn delete_customer(&self, id: &str) -> Result<()> {
        let path = format!("/customers/{id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

    /// Get handoff context for a customer by identity lookup.
    pub async fn handoff(&self, params: &HandoffParams) -> Result<HandoffResponse> {
        let query = QueryParams::new()
            .push_opt("customerId", params.customer_id.as_deref())
            .push_opt("phone", params.phone.as_deref())
            .push_opt("email", params.email.as_deref())
            .push_opt("externalId", params.external_id.as_deref())
            .push_opt("narrative", params.narrative.as_deref())
            .push_opt("fresh", params.fresh.as_deref());
        self.request(reqwest::Method::GET, "/customers/handoff", &query, None::<&()>).await
    }

    /// Get handoff context for a customer by ID.
    pub async fn handoff_by_id(&self, id: &str, narrative: Option<&str>, fresh: Option<&str>) -> Result<HandoffResponse> {
        let path = format!("/customers/{id}/handoff");
        let query = QueryParams::new()
            .push_opt("narrative", narrative)
            .push_opt("fresh", fresh);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    // ── Memories ────────────────────────────────────────

    /// Ingest a conversation for memory extraction.
    pub async fn ingest_memories(&self, customer_id: &str, req: &MemoryIngestRequest) -> Result<MemoryIngestResponse> {
        let path = format!("/customers/{customer_id}/memories/ingest");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(req)).await
    }

    /// Look up memories for a customer by topic.
    pub async fn lookup_memories(&self, customer_id: &str, topic: &str) -> Result<MemoryContext> {
        let path = format!("/customers/{customer_id}/memories/lookup");
        let query = QueryParams::new().push("topic", topic);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    /// Look up memories by identity (email, phone, external ID).
    pub async fn lookup_memories_by_identity(&self, params: &MemoryLookupParams) -> Result<MemoryContext> {
        let query = QueryParams::new()
            .push("topic", &params.topic)
            .push_opt("phone", params.phone.as_deref())
            .push_opt("email", params.email.as_deref())
            .push_opt("externalId", params.external_id.as_deref());
        self.request(reqwest::Method::GET, "/customers/memories/lookup", &query, None::<&()>).await
    }

    /// List memories for a customer with pagination.
    pub async fn list_memories(&self, customer_id: &str, page: Option<u32>, limit: Option<u32>) -> Result<MemoryListResponse> {
        let path = format!("/customers/{customer_id}/memories");
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    /// Update a memory.
    pub async fn update_memory(&self, customer_id: &str, mem_id: &str, req: &MemoryUpdateRequest) -> Result<()> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request::<serde_json::Value>(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    /// Delete a memory.
    pub async fn delete_memory(&self, customer_id: &str, mem_id: &str) -> Result<()> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

    /// Manually add a memory for a customer.
    pub async fn add_memory(&self, customer_id: &str, req: &MemoryAddRequest) -> Result<Memory> {
        let path = format!("/customers/{customer_id}/memories");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(req)).await
    }

    /// Get a specific memory by ID.
    pub async fn get_memory(&self, customer_id: &str, mem_id: &str) -> Result<Memory> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Look up feedback for a customer.
    pub async fn lookup_feedback(&self, req: &FeedbackLookupRequest) -> Result<FeedbackLookupResponse> {
        self.request(reqwest::Method::POST, "/memories/lookup-feedback", &QueryParams::new(), Some(req))
            .await
    }

    // ── Conversations ───────────────────────────────────

    /// Start a new conversation for a customer.
    pub async fn start_conversation(&self, customer_id: &str, channel: &str) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(&serde_json::json!({ "channel": channel })))
            .await
    }

    /// List conversations for a customer with pagination.
    pub async fn list_conversations(&self, customer_id: &str, page: Option<u32>, limit: Option<u32>) -> Result<ConversationListResponse> {
        let path = format!("/customers/{customer_id}/conversations");
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    /// End a conversation by path parameters.
    pub async fn end_conversation(&self, customer_id: &str, conversation_id: &str, outcome: Option<&str>) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations/{conversation_id}");
        let body = outcome.map(|o| serde_json::json!({ "outcome": o }));
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), body.as_ref()).await
    }

    /// End a conversation using flat request body (no path params).
    pub async fn end_conversation_flat(&self, req: &ConversationEndFlatRequest) -> Result<()> {
        self.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/end", &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    /// Escalate a conversation by path parameters.
    pub async fn escalate_conversation(&self, customer_id: &str, conversation_id: &str, reason: Option<&str>) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations/{conversation_id}/escalate");
        let body = reason.map(|r| serde_json::json!({ "reason": r }));
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), body.as_ref()).await
    }

    /// Escalate a conversation using flat request body (no path params).
    pub async fn escalate_conversation_flat(&self, req: &ConversationEscalateFlatRequest) -> Result<()> {
        self.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/escalate", &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    // ── Embed ───────────────────────────────────────────

    /// Create an embed token for customer-facing widgets.
    pub async fn create_embed_token(&self, req: &EmbedTokenRequest) -> Result<EmbedTokenResponse> {
        self.request(reqwest::Method::POST, "/embed/tokens", &QueryParams::new(), Some(req))
            .await
    }

    /// Get handoff context using an embed token.
    pub async fn get_embed_handoff(&self, token: &str) -> Result<serde_json::Value> {
        let query = QueryParams::new().push("token", token);
        self.request(reqwest::Method::GET, "/embed/handoff", &query, None::<&()>).await
    }

    // ── Entities ────────────────────────────────────────

    /// List entities with pagination and optional type filter.
    pub async fn list_entities(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
        r#type: Option<&str>,
    ) -> Result<EntityListResponse> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit)
            .push_opt("type", r#type);
        self.request(reqwest::Method::GET, "/entities", &query, None::<&()>).await
    }

    /// Get a single entity by ID.
    pub async fn get_entity(&self, entity_id: &str) -> Result<Entity> {
        let path = format!("/entities/{entity_id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Search entities by query string.
    pub async fn search_entities(&self, params: &EntitySearchParams) -> Result<EntityListResponse> {
        let query = QueryParams::new()
            .push("query", &params.query)
            .push_opt("type", params.r#type.as_deref())
            .push_opt_u32("limit", params.limit);
        self.request(reqwest::Method::GET, "/entities/search", &query, None::<&()>).await
    }

    /// Get the entity relationship graph.
    pub async fn get_entity_graph(
        &self,
        entity_id: Option<&str>,
        depth: Option<u32>,
    ) -> Result<EntityGraphResponse> {
        let query = QueryParams::new()
            .push_opt("entityId", entity_id)
            .push_opt_u32("depth", depth);
        self.request(reqwest::Method::GET, "/entities/graph", &query, None::<&()>).await
    }

    /// Delete an entity.
    pub async fn delete_entity(&self, entity_id: &str) -> Result<()> {
        let path = format!("/entities/{entity_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

    // ── Orgs ────────────────────────────────────────────

    /// Create a new organization.
    pub async fn create_org(&self, req: &OrgCreateRequest) -> Result<Org> {
        self.request(reqwest::Method::POST, "/orgs", &QueryParams::new(), Some(req)).await
    }

    /// Get an organization by ID.
    pub async fn get_org(&self, org_id: &str) -> Result<Org> {
        let path = format!("/orgs/{org_id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Update an organization.
    pub async fn update_org(&self, org_id: &str, req: &OrgUpdateRequest) -> Result<Org> {
        let path = format!("/orgs/{org_id}");
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req)).await
    }

    /// Add a member to an organization.
    pub async fn add_org_member(&self, org_id: &str, req: &OrgMemberAddRequest) -> Result<OrgMember> {
        let path = format!("/orgs/{org_id}/members");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(req)).await
    }

    /// Get an organization member by UID.
    pub async fn get_org_member(&self, org_id: &str, uid: &str) -> Result<OrgMember> {
        let path = format!("/orgs/{org_id}/members/{uid}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Update an organization member's role.
    pub async fn update_org_member(
        &self,
        org_id: &str,
        uid: &str,
        req: &OrgMemberUpdateRequest,
    ) -> Result<OrgMember> {
        let path = format!("/orgs/{org_id}/members/{uid}");
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req)).await
    }

    /// Remove a member from an organization.
    pub async fn remove_org_member(&self, org_id: &str, uid: &str) -> Result<()> {
        let path = format!("/orgs/{org_id}/members/{uid}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

    /// Create an API key for an organization.
    pub async fn create_org_api_key(
        &self,
        org_id: &str,
        req: Option<&OrgApiKeyCreateRequest>,
    ) -> Result<OrgApiKey> {
        let path = format!("/orgs/{org_id}/api-keys");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), req).await
    }

    /// List API keys for an organization.
    pub async fn list_org_api_keys(&self, org_id: &str) -> Result<Vec<OrgApiKey>> {
        let path = format!("/orgs/{org_id}/api-keys");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Delete an API key.
    pub async fn delete_org_api_key(&self, org_id: &str, key_id: &str) -> Result<()> {
        let path = format!("/orgs/{org_id}/api-keys/{key_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

    /// Get audit logs for an organization.
    pub async fn get_org_audit_logs(
        &self,
        org_id: &str,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<OrgAuditLog>> {
        let path = format!("/orgs/{org_id}/audit-logs");
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    // ── Insights ────────────────────────────────────────

    /// Get the insights dashboard summary.
    pub async fn insights_dashboard(&self) -> Result<InsightsDashboard> {
        self.request(reqwest::Method::GET, "/insights/dashboard", &QueryParams::new(), None::<&()>)
            .await
    }

    /// Get buying signals, optionally filtered by customer.
    pub async fn buying_signals(
        &self,
        customer_id: Option<&str>,
        limit: Option<u32>,
    ) -> Result<Vec<BuyingSignal>> {
        let query = QueryParams::new()
            .push_opt("customerId", customer_id)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/insights/buying-signals", &query, None::<&()>).await
    }

    /// Get sentiment time series, optionally filtered by customer.
    pub async fn sentiment_time_series(
        &self,
        customer_id: Option<&str>,
        days: Option<u32>,
    ) -> Result<Vec<SentimentPoint>> {
        let query = QueryParams::new()
            .push_opt("customerId", customer_id)
            .push_opt_u32("days", days);
        self.request(reqwest::Method::GET, "/insights/sentiment", &query, None::<&()>).await
    }

    /// List complaints with pagination.
    pub async fn complaints(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<Complaint>> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/insights/complaints", &query, None::<&()>).await
    }

    /// Get a specific complaint by ID.
    pub async fn get_complaint(&self, complaint_id: &str) -> Result<Complaint> {
        let path = format!("/insights/complaints/{complaint_id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Get frequent issues across all customers.
    pub async fn frequent_issues(&self) -> Result<Vec<FrequentIssue>> {
        self.request(reqwest::Method::GET, "/insights/frequent-issues", &QueryParams::new(), None::<&()>)
            .await
    }

    /// Get memories that have been used in conversations.
    pub async fn memory_in_action(&self, limit: Option<u32>) -> Result<Vec<MemoryInAction>> {
        let query = QueryParams::new().push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/insights/memory-in-action", &query, None::<&()>).await
    }

    /// Get conversation volume breakdown by channel.
    pub async fn channel_breakdown(&self) -> Result<Vec<ChannelBreakdown>> {
        self.request(reqwest::Method::GET, "/insights/channels", &QueryParams::new(), None::<&()>)
            .await
    }

    /// Get sales pipeline statistics.
    pub async fn pipeline_stats(&self) -> Result<PipelineStats> {
        self.request(reqwest::Method::GET, "/insights/pipeline-stats", &QueryParams::new(), None::<&()>)
            .await
    }

    /// Get entity graph statistics.
    pub async fn entity_graph_stats(&self) -> Result<serde_json::Value> {
        self.request(reqwest::Method::GET, "/insights/entity-graph/stats", &QueryParams::new(), None::<&()>)
            .await
    }

    /// Get the entity relationship graph from insights.
    pub async fn insights_entity_graph(
        &self,
        entity_id: Option<&str>,
        depth: Option<u32>,
    ) -> Result<EntityGraphResponse> {
        let query = QueryParams::new()
            .push_opt("entityId", entity_id)
            .push_opt_u32("depth", depth);
        self.request(reqwest::Method::GET, "/insights/entity-graph", &query, None::<&()>).await
    }

    /// Get recent conversations across all customers.
    pub async fn recent_conversations(&self, limit: Option<u32>) -> Result<Vec<Conversation>> {
        let query = QueryParams::new().push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/insights/recent-conversations", &query, None::<&()>).await
    }

    /// List all conversations across customers with pagination.
    pub async fn list_all_conversations(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<ConversationListResponse> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/insights/conversations", &query, None::<&()>).await
    }

    /// List insights with pagination and optional type filter.
    pub async fn list_insights(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
        r#type: Option<&str>,
    ) -> Result<InsightListResponse> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit)
            .push_opt("type", r#type);
        self.request(reqwest::Method::GET, "/insights", &query, None::<&()>).await
    }

    /// Take action on an insight (dismiss, archive, etc).
    pub async fn act_on_insight(&self, insight_id: &str, req: &InsightActionRequest) -> Result<()> {
        let path = format!("/insights/{insight_id}/action");
        self.request::<serde_json::Value>(reqwest::Method::POST, &path, &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    // ── Webhooks ────────────────────────────────────────

    /// Create a webhook for an organization.
    pub async fn create_webhook(&self, org_id: &str, req: &WebhookCreateRequest) -> Result<Webhook> {
        let path = format!("/orgs/{org_id}/webhooks");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(req)).await
    }

    /// List webhooks for an organization.
    pub async fn list_webhooks(&self, org_id: &str) -> Result<Vec<Webhook>> {
        let path = format!("/orgs/{org_id}/webhooks");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    /// Update a webhook.
    pub async fn update_webhook(
        &self,
        org_id: &str,
        webhook_id: &str,
        req: &WebhookUpdateRequest,
    ) -> Result<Webhook> {
        let path = format!("/orgs/{org_id}/webhooks/{webhook_id}");
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req)).await
    }

    /// Delete a webhook.
    pub async fn delete_webhook(&self, org_id: &str, webhook_id: &str) -> Result<()> {
        let path = format!("/orgs/{org_id}/webhooks/{webhook_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }
}

// ── Builder ─────────────────────────────────────────────

/// Builder for [`ConvoMemClient`].
///
/// # Example
/// ```no_run
/// use convomem::ConvoMemClient;
/// use std::time::Duration;
///
/// let client = ConvoMemClient::builder()
///     .api_key("your-api-key")
///     .base_url("https://custom.api.com/v1")
///     .timeout(Duration::from_secs(60))
///     .build()
///     .unwrap();
/// ```
#[derive(Default)]
pub struct ConvoMemClientBuilder {
    api_key: Option<String>,
    base_url: Option<String>,
    timeout: Option<Duration>,
}

impl ConvoMemClientBuilder {
    /// Set the API key (required).
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    /// Set the base URL (defaults to `https://api.convomem.com/api/v1`).
    pub fn base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = Some(base_url.into());
        self
    }

    /// Set the request timeout (defaults to 30 seconds).
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    /// Build the client. Returns error if `api_key` is not set.
    pub fn build(self) -> Result<ConvoMemClient> {
        let api_key = self.api_key.ok_or(ConvoMemError::Config("api_key is required".into()))?;

        let mut builder = reqwest::Client::builder();
        if let Some(timeout) = self.timeout {
            builder = builder.timeout(timeout);
        } else {
            builder = builder.timeout(DEFAULT_TIMEOUT);
        }

        Ok(ConvoMemClient {
            http: builder.build()?,
            base_url: self.base_url.unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
            api_key,
        })
    }
}
