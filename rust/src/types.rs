use serde::{Deserialize, Serialize};

// ── Capture ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
        if let Some(v) = &self.customer_id { params.push(format!("customerId={v}")); }
        if let Some(v) = &self.phone { params.push(format!("phone={v}")); }
        if let Some(v) = &self.email { params.push(format!("email={v}")); }
        if let Some(v) = &self.external_id { params.push(format!("externalId={v}")); }
        if let Some(v) = &self.topic { params.push(format!("topic={v}")); }
        if let Some(v) = &self.auto_create { params.push(format!("autoCreate={v}")); }
        if let Some(v) = &self.user_name { params.push(format!("userName={v}")); }
        if params.is_empty() { String::new() } else { format!("?{}", params.join("&")) }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: String,
    #[serde(default)]
    pub org_id: Option<String>,
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
    pub last_sentiment: Option<f64>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub memory_count: Option<u32>,
    #[serde(default)]
    pub conversation_count: Option<u32>,
    #[serde(default)]
    pub last_contact_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerListResponse {
    pub customers: Vec<Customer>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
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
        if let Some(v) = &self.customer_id { params.push(format!("customerId={v}")); }
        if let Some(v) = &self.phone { params.push(format!("phone={v}")); }
        if let Some(v) = &self.email { params.push(format!("email={v}")); }
        if let Some(v) = &self.external_id { params.push(format!("externalId={v}")); }
        if let Some(v) = &self.narrative { params.push(format!("narrative={v}")); }
        if let Some(v) = &self.fresh { params.push(format!("fresh={v}")); }
        if params.is_empty() { String::new() } else { format!("?{}", params.join("&")) }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    #[serde(default)]
    pub generated_at: Option<String>,
    #[serde(default)]
    pub cached: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    #[serde(default)]
    pub ended_at: Option<String>,
    #[serde(default)]
    pub messages_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyMemory {
    pub content: String,
    pub category: String,
    #[serde(default)]
    pub channel_source: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SentimentTrend {
    #[serde(default)]
    pub points: Option<Vec<serde_json::Value>>,
    pub direction: String,
    pub current: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenIssue {
    pub is_open: bool,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub conversation_id: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
}

// ── Memories ────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryIngestRequest {
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
        if let Some(v) = &self.phone { params.push(format!("phone={v}")); }
        if let Some(v) = &self.email { params.push(format!("email={v}")); }
        if let Some(v) = &self.external_id { params.push(format!("externalId={v}")); }
        format!("?{}", params.join("&"))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryContext {
    pub context: String,
    pub token_count: u32,
    pub memories: Vec<Memory>,
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
    pub fact: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub importance: Option<f64>,
}

// ── Conversations ───────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    #[serde(default)]
    pub org_id: Option<String>,
    #[serde(default)]
    pub customer_id: Option<String>,
    #[serde(default)]
    pub external_id: Option<String>,
    pub channel: String,
    pub status: String,
    #[serde(default)]
    pub memories_captured: Option<u32>,
    #[serde(default)]
    pub messages_count: Option<u32>,
    #[serde(default)]
    pub sentiment: Option<f64>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub outcome: Option<String>,
    #[serde(default)]
    pub messages: Option<Vec<Message>>,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub ended_at: Option<String>,
    #[serde(default)]
    pub last_activity_at: Option<String>,
    #[serde(default)]
    pub customer: Option<Customer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationListResponse {
    pub conversations: Vec<Conversation>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEndFlatRequest {
    pub customer_id: String,
    pub conversation_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEscalateFlatRequest {
    pub customer_id: String,
    pub conversation_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

// ── Embed ───────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct EmbedTokenResponse {
    pub token: String,
    pub expires_in: u32,
    pub scope: String,
}

// ── Entities ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entity {
    pub id: String,
    #[serde(default)]
    pub org_id: Option<String>,
    pub name: String,
    pub r#type: String,
    #[serde(default)]
    pub properties: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityListResponse {
    pub entities: Vec<Entity>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Default, Serialize)]
pub struct EntitySearchParams {
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityGraphResponse {
    pub nodes: Vec<EntityGraphNode>,
    pub edges: Vec<EntityGraphEdge>,
}

#[derive(Debug, Deserialize)]
pub struct EntityGraphNode {
    pub id: String,
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Deserialize)]
pub struct EntityGraphEdge {
    pub source: String,
    pub target: String,
    pub relationship: String,
}

// ── Orgs ────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Org {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub plan: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgCreateRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<String>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgUpdateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMember {
    pub uid: String,
    pub role: String,
    #[serde(default)]
    pub joined_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMemberAddRequest {
    pub uid: String,
    pub role: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMemberUpdateRequest {
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgApiKey {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub key: Option<String>,
    #[serde(default)]
    pub prefix: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub last_used_at: Option<String>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgApiKeyCreateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgAuditLog {
    pub id: String,
    pub action: String,
    #[serde(default)]
    pub actor: Option<String>,
    #[serde(default)]
    pub target: Option<String>,
    #[serde(default)]
    pub details: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<String>,
}

// ── Insights ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsDashboard {
    #[serde(default)]
    pub total_customers: Option<u64>,
    #[serde(default)]
    pub total_memories: Option<u64>,
    #[serde(default)]
    pub total_conversations: Option<u64>,
    #[serde(default)]
    pub active_conversations: Option<u64>,
    #[serde(default)]
    pub avg_sentiment: Option<f64>,
    #[serde(flatten)]
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuyingSignal {
    pub id: String,
    #[serde(default)]
    pub customer_id: Option<String>,
    pub signal: String,
    #[serde(default)]
    pub confidence: Option<f64>,
    #[serde(default)]
    pub detected_at: Option<String>,
    #[serde(flatten)]
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SentimentPoint {
    pub timestamp: String,
    pub score: f64,
    #[serde(default)]
    pub count: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Complaint {
    pub id: String,
    #[serde(default)]
    pub customer_id: Option<String>,
    pub content: String,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub severity: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(flatten)]
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct FrequentIssue {
    pub issue: String,
    pub count: u32,
    #[serde(default)]
    pub percentage: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInAction {
    pub id: String,
    pub fact: String,
    #[serde(default)]
    pub used_in_conversation: Option<String>,
    #[serde(default)]
    pub impact: Option<String>,
    #[serde(flatten)]
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ChannelBreakdown {
    pub channel: String,
    pub count: u32,
    #[serde(default)]
    pub percentage: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineStats {
    #[serde(default)]
    pub total_leads: Option<u64>,
    #[serde(default)]
    pub qualified_leads: Option<u64>,
    #[serde(default)]
    pub conversion_rate: Option<f64>,
    #[serde(flatten)]
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Insight {
    pub id: String,
    pub r#type: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(flatten)]
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightListResponse {
    pub insights: Vec<Insight>,
    pub page: u32,
    pub limit: u32,
    pub total: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightActionRequest {
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

// ── Webhooks ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Webhook {
    pub id: String,
    #[serde(default)]
    pub org_id: Option<String>,
    pub url: String,
    #[serde(default)]
    pub events: Option<Vec<String>>,
    #[serde(default)]
    pub secret: Option<String>,
    #[serde(default)]
    pub active: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookCreateRequest {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub events: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secret: Option<String>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookUpdateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub events: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secret: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,
}

// ── Missing Memory Types ────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryAddRequest {
    pub fact: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub importance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_type: Option<String>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackLookupRequest {
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
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackLookupResponse {
    pub found: bool,
    #[serde(default)]
    pub feedback: Option<serde_json::Value>,
    #[serde(default)]
    pub memories: Option<Vec<Memory>>,
}

// ── Missing Conversation Types ──────────────────────────

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEndRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEndResponse {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub ended_at: Option<String>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEscalateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConversationEscalateResponse {
    pub id: String,
    pub status: String,
}
