use serde::{Deserialize, Serialize};

// ── Capture ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CaptureRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<Message>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct CaptureResponse {
    pub conversation_id: String,
    pub customer_id: String,
    pub status: String,
    pub is_new_conversation: bool,
    pub is_new_customer: bool,
}

// ── Customers ───────────────────────────────────────────

#[derive(Debug, Default, Serialize)]
pub struct CustomerLookupParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topic: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_create: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_name: Option<String>,
}

impl CustomerLookupParams {
    pub fn to_query_string(&self) -> String {
        let mut params = Vec::new();
        if let Some(ref v) = self.customer_id { params.push(format!("customerId={v}")); }
        if let Some(ref v) = self.phone { params.push(format!("phone={v}")); }
        if let Some(ref v) = self.email { params.push(format!("email={v}")); }
        if let Some(ref v) = self.external_id { params.push(format!("externalId={v}")); }
        if let Some(ref v) = self.topic { params.push(format!("topic={v}")); }
        if let Some(ref v) = self.auto_create { params.push(format!("autoCreate={v}")); }
        if let Some(ref v) = self.user_name { params.push(format!("userName={v}")); }
        if params.is_empty() { String::new() } else { format!("?{}", params.join("&")) }
    }
}

#[derive(Debug, Deserialize)]
pub struct CustomerLookupResponse {
    pub found: bool,
    #[serde(default)]
    pub is_new_customer: bool,
    pub customer: Option<Customer>,
    #[serde(default)]
    pub memories: Vec<Memory>,
    #[serde(default)]
    pub context: Option<String>,
    #[serde(default)]
    pub token_count: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct CustomerCreateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct Customer {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub external_id: Option<String>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CustomerListResponse {
    pub data: Vec<Customer>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Default, Serialize)]
pub struct CustomerUpdateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

// ── Handoff ─────────────────────────────────────────────

#[derive(Debug, Default, Serialize)]
pub struct HandoffParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub narrative: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fresh: Option<String>,
}

impl HandoffParams {
    pub fn to_query_string(&self) -> String {
        let mut params = Vec::new();
        if let Some(ref v) = self.customer_id { params.push(format!("customerId={v}")); }
        if let Some(ref v) = self.phone { params.push(format!("phone={v}")); }
        if let Some(ref v) = self.email { params.push(format!("email={v}")); }
        if let Some(ref v) = self.external_id { params.push(format!("externalId={v}")); }
        if let Some(ref v) = self.narrative { params.push(format!("narrative={v}")); }
        if let Some(ref v) = self.fresh { params.push(format!("fresh={v}")); }
        if params.is_empty() { String::new() } else { format!("?{}", params.join("&")) }
    }
}

#[derive(Debug, Deserialize)]
pub struct HandoffResponse {
    pub found: bool,
    pub customer: Option<Customer>,
    #[serde(default)]
    pub journey: Vec<JourneyEntry>,
    #[serde(default)]
    pub key_memories: Vec<KeyMemory>,
    pub sentiment_trend: SentimentTrend,
    pub open_issue: OpenIssue,
    #[serde(default)]
    pub narrative: Option<String>,
    #[serde(default)]
    pub narrative_source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct JourneyEntry {
    #[serde(default)]
    pub conversation_id: Option<String>,
    pub channel: String,
    pub status: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub outcome: Option<String>,
    #[serde(default)]
    pub sentiment: Option<f64>,
    #[serde(default)]
    pub started_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct KeyMemory {
    pub content: String,
    pub category: String,
    #[serde(default)]
    pub channel_source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SentimentTrend {
    pub direction: String,
    pub current: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct OpenIssue {
    pub is_open: bool,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
}

// ── Memories ────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MemoryIngestRequest {
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MemoryIngestResponse {
    pub capture_id: String,
    pub status: String,
}

#[derive(Debug, Default, Serialize)]
pub struct MemoryLookupParams {
    pub topic: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
}

impl MemoryLookupParams {
    pub fn to_query_string(&self) -> String {
        let mut params = vec![format!("topic={}", self.topic)];
        if let Some(ref v) = self.phone { params.push(format!("phone={v}")); }
        if let Some(ref v) = self.email { params.push(format!("email={v}")); }
        if let Some(ref v) = self.external_id { params.push(format!("externalId={v}")); }
        format!("?{}", params.join("&"))
    }
}

#[derive(Debug, Deserialize)]
pub struct MemoryContext {
    pub context: String,
    pub token_count: u32,
    pub memories: Vec<Memory>,
}

#[derive(Debug, Deserialize)]
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
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MemoryListResponse {
    pub data: Vec<Memory>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Default, Serialize)]
pub struct MemoryUpdateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fact: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub importance: Option<f64>,
}

// ── Conversations ───────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct Conversation {
    pub id: String,
    #[serde(default)]
    pub customer_id: Option<String>,
    pub channel: String,
    pub status: String,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub ended_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConversationListResponse {
    pub data: Vec<Conversation>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Serialize)]
pub struct ConversationEndFlatRequest {
    pub customer_id: String,
    pub conversation_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConversationEscalateFlatRequest {
    pub customer_id: String,
    pub conversation_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

// ── Embed ───────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct EmbedTokenRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttl_seconds: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct EmbedTokenResponse {
    pub token: String,
    pub expires_in: u32,
    pub scope: String,
}
