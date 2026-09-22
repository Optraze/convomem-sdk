use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryIngestRequest {
    pub messages: Vec<super::Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub infer: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryIngestResponse {
    pub capture_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct MemoryLookupParams {
    pub topic: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub threshold: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rerank: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_only: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub explain: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_agent_facts: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verify: Option<bool>,
}

impl MemoryLookupParams {
    pub(crate) fn to_query_params(&self) -> crate::client::QueryParams {
        crate::client::QueryParams::new()
            .push("topic", &self.topic)
            .push_opt("phone", self.phone.as_deref())
            .push_opt("email", self.email.as_deref())
            .push_opt("externalId", self.external_id.as_deref())
            .push_opt_u32("maxTokens", self.max_tokens)
            .push_opt_u32("limit", self.limit)
            .push_opt("threshold", self.threshold.map(|v| v.to_string()).as_deref())
            .push_opt("rerank", self.rerank.map(|v| v.to_string()).as_deref())
            .push_opt("latestOnly", self.latest_only.map(|v| v.to_string()).as_deref())
            .push_opt("explain", self.explain.map(|v| v.to_string()).as_deref())
            .push_opt("referenceDate", self.reference_date.as_deref())
            .push_opt("includeAgentFacts", self.include_agent_facts.map(|v| v.to_string()).as_deref())
            .push_opt("verify", self.verify.map(|v| v.to_string()).as_deref())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryContext {
    pub context: String,
    pub token_count: u32,
    pub memories: Vec<Memory>,
    #[serde(default)]
    pub retrieval_config: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Memory {
    pub id: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub fact: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub memory_type: Option<String>,
    #[serde(default)]
    pub importance: Option<f64>,
    #[serde(default)]
    pub relevance: Option<f64>,
    #[serde(default)]
    pub score: Option<f64>,
    #[serde(default)]
    pub sentiment: Option<String>,
    #[serde(default)]
    pub source_context: Option<String>,
    #[serde(default)]
    pub occurred_at: Option<String>,
    #[serde(default)]
    pub event_date: Option<String>,
    #[serde(default)]
    pub event_date_precision: Option<String>,
    #[serde(default)]
    pub event_date_source: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub language_source: Option<String>,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub expiry_is_fixed: Option<bool>,
    #[serde(default)]
    pub is_expired: Option<bool>,
    #[serde(default)]
    pub speaker: Option<String>,
    #[serde(default)]
    pub score_details: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryListResponse {
    pub memories: Vec<Memory>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryUpdateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub importance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryAddRequest {
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub importance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
}
