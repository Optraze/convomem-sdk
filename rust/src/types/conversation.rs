use serde::{Deserialize, Serialize};

use super::{Customer, Message};

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
