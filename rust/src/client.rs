use std::time::Duration;

use crate::error::{ConvoMemError, Result};
use crate::types::*;

pub(crate) const DEFAULT_BASE_URL: &str = "https://api.convomem.com/api/v1";
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

/// ConvoMem low-level resource client.
///
/// Prefer [`crate::ConvoMem`] for day-to-day use — it adds identity-based
/// dual routing on top of this client.
///
/// # Example
/// ```no_run
/// use convomem::ConvoMemClient;
///
/// #[tokio::main]
/// async fn main() {
///     let client = ConvoMemClient::new("your-api-key");
///     let resp = client.capture(&convomem::CaptureRequest {
///         messages: Some(vec![]),
///         ..Default::default()
///     }).await.unwrap();
/// }
/// ```
#[derive(Debug, Clone)]
pub struct ConvoMemClient {
    http: reqwest::Client,
    api_key: String,
}

/// Query parameter list.  Skips `None` values automatically.
pub(crate) struct QueryParams(Vec<(&'static str, String)>);

impl QueryParams {
    pub(crate) fn new() -> Self {
        Self(Vec::new())
    }

    pub(crate) fn push(mut self, key: &'static str, value: &str) -> Self {
        self.0.push((key, value.to_string()));
        self
    }

    pub(crate) fn push_opt(mut self, key: &'static str, value: Option<&str>) -> Self {
        if let Some(v) = value {
            self.0.push((key, v.to_string()));
        }
        self
    }

    pub(crate) fn push_opt_u32(self, key: &'static str, value: Option<u32>) -> Self {
        self.push_opt(key, value.map(|v| v.to_string()).as_deref())
    }

    pub(crate) fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub(crate) fn as_slice(&self) -> Vec<(&str, &str)> {
        self.0.iter().map(|(k, v)| (*k, v.as_str())).collect()
    }
}

impl ConvoMemClient {
    /// Create a new client with default settings (30s timeout).
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
    pub(crate) async fn request<T: serde::de::DeserializeOwned>(
        &self,
        method: reqwest::Method,
        path: &str,
        query: &QueryParams,
        body: Option<&impl serde::Serialize>,
    ) -> Result<T> {
        let url = format!("{DEFAULT_BASE_URL}{path}");

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

    pub async fn capture(&self, req: &CaptureRequest) -> Result<CaptureResponse> {
        self.request(reqwest::Method::POST, "/capture", &QueryParams::new(), Some(req))
            .await
    }

    // ── Customers ───────────────────────────────────────

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

    pub async fn create_customer(&self, req: &CustomerCreateRequest) -> Result<Customer> {
        self.request(reqwest::Method::POST, "/customers", &QueryParams::new(), Some(req))
            .await
    }

    pub async fn list_customers(&self, page: Option<u32>, limit: Option<u32>) -> Result<CustomerListResponse> {
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, "/customers", &query, None::<&()>).await
    }

    pub async fn get_customer(&self, id: &str) -> Result<Customer> {
        let path = format!("/customers/{id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    pub async fn update_customer(&self, id: &str, req: &CustomerUpdateRequest) -> Result<Customer> {
        let path = format!("/customers/{id}");
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req)).await
    }

    pub async fn delete_customer(&self, id: &str) -> Result<()> {
        let path = format!("/customers/{id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

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

    pub async fn handoff_by_id(&self, id: &str, narrative: Option<&str>, fresh: Option<&str>) -> Result<HandoffResponse> {
        let path = format!("/customers/{id}/handoff");
        let query = QueryParams::new()
            .push_opt("narrative", narrative)
            .push_opt("fresh", fresh);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    // ── Memories ────────────────────────────────────────

    pub async fn ingest_memories(&self, customer_id: &str, req: &MemoryIngestRequest) -> Result<MemoryIngestResponse> {
        let path = format!("/customers/{customer_id}/memories/ingest");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(req)).await
    }

    pub async fn lookup_memories(&self, customer_id: &str, topic: &str) -> Result<MemoryContext> {
        let path = format!("/customers/{customer_id}/memories/lookup");
        let query = QueryParams::new().push("topic", topic);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    pub async fn lookup_memories_by_identity(&self, params: &MemoryLookupParams) -> Result<MemoryContext> {
        let query = QueryParams::new()
            .push("topic", &params.topic)
            .push_opt("phone", params.phone.as_deref())
            .push_opt("email", params.email.as_deref())
            .push_opt("externalId", params.external_id.as_deref());
        self.request(reqwest::Method::GET, "/customers/memories/lookup", &query, None::<&()>).await
    }

    pub async fn list_memories(&self, customer_id: &str, page: Option<u32>, limit: Option<u32>) -> Result<MemoryListResponse> {
        let path = format!("/customers/{customer_id}/memories");
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    pub async fn update_memory(&self, customer_id: &str, mem_id: &str, req: &MemoryUpdateRequest) -> Result<()> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request::<serde_json::Value>(reqwest::Method::PATCH, &path, &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    pub async fn delete_memory(&self, customer_id: &str, mem_id: &str) -> Result<()> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, &QueryParams::new(), None::<&()>)
            .await?;
        Ok(())
    }

    pub async fn add_memory(&self, customer_id: &str, req: &MemoryAddRequest) -> Result<Memory> {
        let path = format!("/customers/{customer_id}/memories");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(req)).await
    }

    pub async fn get_memory(&self, customer_id: &str, mem_id: &str) -> Result<Memory> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request(reqwest::Method::GET, &path, &QueryParams::new(), None::<&()>).await
    }

    pub async fn lookup_feedback(&self, req: &FeedbackLookupRequest) -> Result<FeedbackLookupResponse> {
        self.request(reqwest::Method::POST, "/memories/lookup-feedback", &QueryParams::new(), Some(req))
            .await
    }

    // ── Conversations ───────────────────────────────────

    pub async fn start_conversation(&self, customer_id: &str, channel: &str) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations");
        self.request(reqwest::Method::POST, &path, &QueryParams::new(), Some(&serde_json::json!({ "channel": channel })))
            .await
    }

    pub async fn list_conversations(&self, customer_id: &str, page: Option<u32>, limit: Option<u32>) -> Result<ConversationListResponse> {
        let path = format!("/customers/{customer_id}/conversations");
        let query = QueryParams::new()
            .push_opt_u32("page", page)
            .push_opt_u32("limit", limit);
        self.request(reqwest::Method::GET, &path, &query, None::<&()>).await
    }

    pub async fn end_conversation(&self, customer_id: &str, conversation_id: &str, outcome: Option<&str>) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations/{conversation_id}");
        let body = outcome.map(|o| serde_json::json!({ "outcome": o }));
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), body.as_ref()).await
    }

    pub async fn end_conversation_flat(&self, req: &ConversationEndFlatRequest) -> Result<()> {
        self.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/end", &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    pub async fn escalate_conversation(&self, customer_id: &str, conversation_id: &str, reason: Option<&str>) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations/{conversation_id}/escalate");
        let body = reason.map(|r| serde_json::json!({ "reason": r }));
        self.request(reqwest::Method::PATCH, &path, &QueryParams::new(), body.as_ref()).await
    }

    pub async fn escalate_conversation_flat(&self, req: &ConversationEscalateFlatRequest) -> Result<()> {
        self.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/escalate", &QueryParams::new(), Some(req))
            .await?;
        Ok(())
    }

    // ── Embed ───────────────────────────────────────────

    pub async fn create_embed_token(&self, req: &EmbedTokenRequest) -> Result<EmbedTokenResponse> {
        self.request(reqwest::Method::POST, "/embed/tokens", &QueryParams::new(), Some(req))
            .await
    }

    pub async fn get_embed_handoff(&self, token: &str) -> Result<serde_json::Value> {
        let query = QueryParams::new().push("token", token);
        self.request(reqwest::Method::GET, "/embed/handoff", &query, None::<&()>).await
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
///     .timeout(Duration::from_secs(60))
///     .build()
///     .unwrap();
/// ```
#[derive(Default)]
pub struct ConvoMemClientBuilder {
    api_key: Option<String>,
    timeout: Option<Duration>,
}

impl ConvoMemClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

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
            api_key,
        })
    }
}
