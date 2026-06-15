use std::time::Duration;

use crate::error::{ConvoMemError, Result};
use crate::types::*;

const DEFAULT_BASE_URL: &str = "https://api.convomem.com/api/v1";

pub struct ConvoMemClient {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl ConvoMemClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("failed to build HTTP client"),
            base_url: DEFAULT_BASE_URL.to_string(),
            api_key: api_key.into(),
        }
    }

    pub fn builder() -> ConvoMemClientBuilder {
        ConvoMemClientBuilder::default()
    }

    async fn request<T: serde::de::DeserializeOwned>(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<&impl serde::Serialize>,
    ) -> Result<T> {
        let url = format!("{}{}", self.base_url, path);

        let mut req = self
            .http
            .request(method, &url)
            .header("X-API-Key", &self.api_key);

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

        let data = res.json::<T>().await?;
        Ok(data)
    }

    // ── Capture ─────────────────────────────────────────

    pub async fn capture(&self, req: &CaptureRequest) -> Result<CaptureResponse> {
        self.request(reqwest::Method::POST, "/capture", Some(req))
            .await
    }

    // ── Customers ───────────────────────────────────────

    pub async fn lookup_customer(&self, params: &CustomerLookupParams) -> Result<CustomerLookupResponse> {
        let query = params.to_query_string();
        let path = format!("/customers/lookup{query}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn create_customer(&self, req: &CustomerCreateRequest) -> Result<Customer> {
        self.request(reqwest::Method::POST, "/customers", Some(req))
            .await
    }

    pub async fn list_customers(&self, page: Option<u32>, limit: Option<u32>) -> Result<CustomerListResponse> {
        let mut path = "/customers".to_string();
        let mut sep = '?';
        if let Some(p) = page {
            path.push_str(&format!("{sep}page={p}"));
            sep = '&';
        }
        if let Some(l) = limit {
            path.push_str(&format!("{sep}limit={l}"));
        }
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn get_customer(&self, id: &str) -> Result<Customer> {
        let path = format!("/customers/{id}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn update_customer(&self, id: &str, req: &CustomerUpdateRequest) -> Result<Customer> {
        let path = format!("/customers/{id}");
        self.request(reqwest::Method::PATCH, &path, Some(req)).await
    }

    pub async fn delete_customer(&self, id: &str) -> Result<()> {
        let path = format!("/customers/{id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, None::<&()>)
            .await?;
        Ok(())
    }

    pub async fn handoff(&self, params: &HandoffParams) -> Result<HandoffResponse> {
        let query = params.to_query_string();
        let path = format!("/customers/handoff{query}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn handoff_by_id(&self, id: &str, narrative: Option<&str>, fresh: Option<&str>) -> Result<HandoffResponse> {
        let mut path = format!("/customers/{id}/handoff");
        let mut sep = '?';
        if let Some(n) = narrative {
            path.push_str(&format!("{sep}narrative={n}"));
            sep = '&';
        }
        if let Some(f) = fresh {
            path.push_str(&format!("{sep}fresh={f}"));
        }
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    // ── Memories ────────────────────────────────────────

    pub async fn ingest_memories(&self, customer_id: &str, req: &MemoryIngestRequest) -> Result<MemoryIngestResponse> {
        let path = format!("/customers/{customer_id}/memories/ingest");
        self.request(reqwest::Method::POST, &path, Some(req)).await
    }

    pub async fn lookup_memories(&self, customer_id: &str, topic: &str) -> Result<MemoryContext> {
        let path = format!("/customers/{customer_id}/memories/lookup?topic={topic}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn lookup_memories_by_identity(&self, params: &MemoryLookupParams) -> Result<MemoryContext> {
        let query = params.to_query_string();
        let path = format!("/customers/memories/lookup{query}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn list_memories(&self, customer_id: &str, page: Option<u32>, limit: Option<u32>) -> Result<MemoryListResponse> {
        let mut path = format!("/customers/{customer_id}/memories");
        let mut sep = '?';
        if let Some(p) = page {
            path.push_str(&format!("{sep}page={p}"));
            sep = '&';
        }
        if let Some(l) = limit {
            path.push_str(&format!("{sep}limit={l}"));
        }
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn update_memory(&self, customer_id: &str, mem_id: &str, req: &MemoryUpdateRequest) -> Result<()> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request::<serde_json::Value>(reqwest::Method::PATCH, &path, Some(req))
            .await?;
        Ok(())
    }

    pub async fn delete_memory(&self, customer_id: &str, mem_id: &str) -> Result<()> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, None::<&()>)
            .await?;
        Ok(())
    }

    // ── Conversations ───────────────────────────────────

    pub async fn start_conversation(&self, customer_id: &str, channel: &str) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations");
        self.request(reqwest::Method::POST, &path, Some(&serde_json::json!({ "channel": channel })))
            .await
    }

    pub async fn list_conversations(&self, customer_id: &str, page: Option<u32>, limit: Option<u32>) -> Result<ConversationListResponse> {
        let mut path = format!("/customers/{customer_id}/conversations");
        let mut sep = '?';
        if let Some(p) = page {
            path.push_str(&format!("{sep}page={p}"));
            sep = '&';
        }
        if let Some(l) = limit {
            path.push_str(&format!("{sep}limit={l}"));
        }
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn end_conversation(&self, customer_id: &str, conversation_id: &str, outcome: Option<&str>) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations/{conversation_id}");
        let body = outcome.map(|o| serde_json::json!({ "outcome": o }));
        self.request(reqwest::Method::PATCH, &path, body.as_ref()).await
    }

    pub async fn end_conversation_flat(&self, req: &ConversationEndFlatRequest) -> Result<()> {
        self.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/end", Some(req))
            .await?;
        Ok(())
    }

    pub async fn escalate_conversation(&self, customer_id: &str, conversation_id: &str, reason: Option<&str>) -> Result<Conversation> {
        let path = format!("/customers/{customer_id}/conversations/{conversation_id}/escalate");
        let body = reason.map(|r| serde_json::json!({ "reason": r }));
        self.request(reqwest::Method::PATCH, &path, body.as_ref()).await
    }

    pub async fn escalate_conversation_flat(&self, req: &ConversationEscalateFlatRequest) -> Result<()> {
        self.request::<serde_json::Value>(reqwest::Method::POST, "/customers/conversations/escalate", Some(req))
            .await?;
        Ok(())
    }

    // ── Embed ───────────────────────────────────────────

    pub async fn create_embed_token(&self, req: &EmbedTokenRequest) -> Result<EmbedTokenResponse> {
        self.request(reqwest::Method::POST, "/embed/tokens", Some(req))
            .await
    }

    pub async fn get_embed_handoff(&self, token: &str) -> Result<serde_json::Value> {
        let path = format!("/embed/handoff?token={token}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }
}

// ── Builder ─────────────────────────────────────────────

#[derive(Default)]
pub struct ConvoMemClientBuilder {
    api_key: Option<String>,
    base_url: Option<String>,
    timeout: Option<Duration>,
}

impl ConvoMemClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = Some(base_url.into());
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
        }

        Ok(ConvoMemClient {
            http: builder.build()?,
            base_url: self.base_url.unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
            api_key,
        })
    }
}
