use serde::{Deserialize, Serialize};

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
