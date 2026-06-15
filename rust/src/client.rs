use std::time::Duration;

use crate::error::{ConvoMemError, Result};
use crate::types::*;

const DEFAULT_BASE_URL: &str = "https://api.convomem.com/api/v1";

#[derive(Debug)]
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

        let text = res.text().await?;
        if text.is_empty() {
            return serde_json::from_str("{}").map_err(|e| e.into());
        }
        let data = serde_json::from_str(&text)?;
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
    // ── Entities ─────────────────────────────────────────

    pub async fn list_entities(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
        r#type: Option<&str>,
    ) -> Result<EntityListResponse> {
        let mut params = vec![];
        if let Some(p) = page { params.push(format!("page={p}")); }
        if let Some(l) = limit { params.push(format!("limit={l}")); }
        if let Some(t) = r#type { params.push(format!("type={t}")); }
        let path = if params.is_empty() {
            "/entities".to_string()
        } else {
            format!("/entities?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn get_entity(&self, entity_id: &str) -> Result<Entity> {
        let path = format!("/entities/{entity_id}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn search_entities(&self, params: &EntitySearchParams) -> Result<EntityListResponse> {
        let mut query = vec![format!("query={}", params.query)];
        if let Some(ref t) = params.r#type { query.push(format!("type={t}")); }
        if let Some(l) = params.limit { query.push(format!("limit={l}")); }
        let path = format!("/entities/search?{}", query.join("&"));
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn get_entity_graph(
        &self,
        entity_id: Option<&str>,
        depth: Option<u32>,
    ) -> Result<EntityGraphResponse> {
        let mut params = vec![];
        if let Some(e) = entity_id { params.push(format!("entityId={e}")); }
        if let Some(d) = depth { params.push(format!("depth={d}")); }
        let path = if params.is_empty() {
            "/entities/graph".to_string()
        } else {
            format!("/entities/graph?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn delete_entity(&self, entity_id: &str) -> Result<()> {
        let path = format!("/entities/{entity_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, None::<&()>)
            .await?;
        Ok(())
    }

    // ── Orgs ──────────────────────────────────────────────

    pub async fn create_org(&self, req: &OrgCreateRequest) -> Result<Org> {
        self.request(reqwest::Method::POST, "/orgs", Some(req)).await
    }

    pub async fn get_org(&self, org_id: &str) -> Result<Org> {
        let path = format!("/orgs/{org_id}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn update_org(&self, org_id: &str, req: &OrgUpdateRequest) -> Result<Org> {
        let path = format!("/orgs/{org_id}");
        self.request(reqwest::Method::PATCH, &path, Some(req)).await
    }

    pub async fn add_org_member(&self, org_id: &str, req: &OrgMemberAddRequest) -> Result<OrgMember> {
        let path = format!("/orgs/{org_id}/members");
        self.request(reqwest::Method::POST, &path, Some(req)).await
    }

    pub async fn get_org_member(&self, org_id: &str, uid: &str) -> Result<OrgMember> {
        let path = format!("/orgs/{org_id}/members/{uid}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn update_org_member(
        &self,
        org_id: &str,
        uid: &str,
        req: &OrgMemberUpdateRequest,
    ) -> Result<OrgMember> {
        let path = format!("/orgs/{org_id}/members/{uid}");
        self.request(reqwest::Method::PATCH, &path, Some(req)).await
    }

    pub async fn remove_org_member(&self, org_id: &str, uid: &str) -> Result<()> {
        let path = format!("/orgs/{org_id}/members/{uid}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, None::<&()>)
            .await?;
        Ok(())
    }

    pub async fn create_org_api_key(
        &self,
        org_id: &str,
        req: Option<&OrgApiKeyCreateRequest>,
    ) -> Result<OrgApiKey> {
        let path = format!("/orgs/{org_id}/api-keys");
        self.request(reqwest::Method::POST, &path, req).await
    }

    pub async fn list_org_api_keys(&self, org_id: &str) -> Result<Vec<OrgApiKey>> {
        let path = format!("/orgs/{org_id}/api-keys");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn delete_org_api_key(&self, org_id: &str, key_id: &str) -> Result<()> {
        let path = format!("/orgs/{org_id}/api-keys/{key_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, None::<&()>)
            .await?;
        Ok(())
    }

    pub async fn get_org_audit_logs(
        &self,
        org_id: &str,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<OrgAuditLog>> {
        let mut params = vec![];
        if let Some(p) = page { params.push(format!("page={p}")); }
        if let Some(l) = limit { params.push(format!("limit={l}")); }
        let path = if params.is_empty() {
            format!("/orgs/{org_id}/audit-logs")
        } else {
            format!("/orgs/{org_id}/audit-logs?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    // ── Insights ──────────────────────────────────────────

    pub async fn insights_dashboard(&self) -> Result<InsightsDashboard> {
        self.request(reqwest::Method::GET, "/insights/dashboard", None::<&()>)
            .await
    }

    pub async fn buying_signals(
        &self,
        customer_id: Option<&str>,
        limit: Option<u32>,
    ) -> Result<Vec<BuyingSignal>> {
        let mut params = vec![];
        if let Some(c) = customer_id { params.push(format!("customerId={c}")); }
        if let Some(l) = limit { params.push(format!("limit={l}")); }
        let path = if params.is_empty() {
            "/insights/buying-signals".to_string()
        } else {
            format!("/insights/buying-signals?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn sentiment_time_series(
        &self,
        customer_id: Option<&str>,
        days: Option<u32>,
    ) -> Result<Vec<SentimentPoint>> {
        let mut params = vec![];
        if let Some(c) = customer_id { params.push(format!("customerId={c}")); }
        if let Some(d) = days { params.push(format!("days={d}")); }
        let path = if params.is_empty() {
            "/insights/sentiment".to_string()
        } else {
            format!("/insights/sentiment?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn complaints(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<Complaint>> {
        let mut params = vec![];
        if let Some(p) = page { params.push(format!("page={p}")); }
        if let Some(l) = limit { params.push(format!("limit={l}")); }
        let path = if params.is_empty() {
            "/insights/complaints".to_string()
        } else {
            format!("/insights/complaints?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn get_complaint(&self, complaint_id: &str) -> Result<Complaint> {
        let path = format!("/insights/complaints/{complaint_id}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn frequent_issues(&self) -> Result<Vec<FrequentIssue>> {
        self.request(reqwest::Method::GET, "/insights/frequent-issues", None::<&()>)
            .await
    }

    pub async fn memory_in_action(&self, limit: Option<u32>) -> Result<Vec<MemoryInAction>> {
        let path = match limit {
            Some(l) => format!("/insights/memory-in-action?limit={l}"),
            None => "/insights/memory-in-action".to_string(),
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn channel_breakdown(&self) -> Result<Vec<ChannelBreakdown>> {
        self.request(reqwest::Method::GET, "/insights/channels", None::<&()>)
            .await
    }

    pub async fn pipeline_stats(&self) -> Result<PipelineStats> {
        self.request(reqwest::Method::GET, "/insights/pipeline-stats", None::<&()>)
            .await
    }

    pub async fn entity_graph_stats(&self) -> Result<serde_json::Value> {
        self.request(reqwest::Method::GET, "/insights/entity-graph/stats", None::<&()>)
            .await
    }

    pub async fn insights_entity_graph(
        &self,
        entity_id: Option<&str>,
        depth: Option<u32>,
    ) -> Result<EntityGraphResponse> {
        let mut params = vec![];
        if let Some(e) = entity_id { params.push(format!("entityId={e}")); }
        if let Some(d) = depth { params.push(format!("depth={d}")); }
        let path = if params.is_empty() {
            "/insights/entity-graph".to_string()
        } else {
            format!("/insights/entity-graph?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn recent_conversations(&self, limit: Option<u32>) -> Result<Vec<Conversation>> {
        let path = match limit {
            Some(l) => format!("/insights/recent-conversations?limit={l}"),
            None => "/insights/recent-conversations".to_string(),
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn list_all_conversations(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<ConversationListResponse> {
        let mut params = vec![];
        if let Some(p) = page { params.push(format!("page={p}")); }
        if let Some(l) = limit { params.push(format!("limit={l}")); }
        let path = if params.is_empty() {
            "/insights/conversations".to_string()
        } else {
            format!("/insights/conversations?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn list_insights(
        &self,
        page: Option<u32>,
        limit: Option<u32>,
        r#type: Option<&str>,
    ) -> Result<InsightListResponse> {
        let mut params = vec![];
        if let Some(p) = page { params.push(format!("page={p}")); }
        if let Some(l) = limit { params.push(format!("limit={l}")); }
        if let Some(t) = r#type { params.push(format!("type={t}")); }
        let path = if params.is_empty() {
            "/insights".to_string()
        } else {
            format!("/insights?{}", params.join("&"))
        };
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn act_on_insight(&self, insight_id: &str, req: &InsightActionRequest) -> Result<()> {
        let path = format!("/insights/{insight_id}/action");
        self.request::<serde_json::Value>(reqwest::Method::POST, &path, Some(req))
            .await?;
        Ok(())
    }

    // ── Webhooks ──────────────────────────────────────────

    pub async fn create_webhook(&self, org_id: &str, req: &WebhookCreateRequest) -> Result<Webhook> {
        let path = format!("/orgs/{org_id}/webhooks");
        self.request(reqwest::Method::POST, &path, Some(req)).await
    }

    pub async fn list_webhooks(&self, org_id: &str) -> Result<Vec<Webhook>> {
        let path = format!("/orgs/{org_id}/webhooks");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn update_webhook(
        &self,
        org_id: &str,
        webhook_id: &str,
        req: &WebhookUpdateRequest,
    ) -> Result<Webhook> {
        let path = format!("/orgs/{org_id}/webhooks/{webhook_id}");
        self.request(reqwest::Method::PATCH, &path, Some(req)).await
    }

    pub async fn delete_webhook(&self, org_id: &str, webhook_id: &str) -> Result<()> {
        let path = format!("/orgs/{org_id}/webhooks/{webhook_id}");
        self.request::<serde_json::Value>(reqwest::Method::DELETE, &path, None::<&()>)
            .await?;
        Ok(())
    }

    // ── Missing Memory Methods ────────────────────────────

    pub async fn add_memory(&self, customer_id: &str, req: &MemoryAddRequest) -> Result<Memory> {
        let path = format!("/customers/{customer_id}/memories");
        self.request(reqwest::Method::POST, &path, Some(req)).await
    }

    pub async fn get_memory(&self, customer_id: &str, mem_id: &str) -> Result<Memory> {
        let path = format!("/customers/{customer_id}/memories/{mem_id}");
        self.request(reqwest::Method::GET, &path, None::<&()>).await
    }

    pub async fn lookup_feedback(&self, req: &FeedbackLookupRequest) -> Result<FeedbackLookupResponse> {
        self.request(reqwest::Method::POST, "/memories/lookup-feedback", Some(req))
            .await
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
