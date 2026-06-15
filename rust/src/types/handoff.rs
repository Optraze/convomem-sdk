use serde::{Deserialize, Serialize};

use super::{Customer};

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
