use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Serialize)]
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
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub occurred_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub infer: Option<bool>,
    /// Social handles, as bare strings or with an explicit platform.
    /// Counts as an identity field in its own right.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub social_handles: Option<Vec<SocialHandle>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Retry key for the same capture payload and agent (24 hours); changed payloads return 409.
    pub idempotency_key: Option<String>,
    /// Close the conversation as COMPLETED once these turns are persisted.
    ///
    /// Prefer this over a separate `end_conversation` call when you already
    /// know the call is over. Capture writes the transcript in a background
    /// job, so closing separately races analysis against that write and can
    /// summarise half a call. Mutually exclusive with [`Self::escalate`].
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_conversation: Option<bool>,
    /// Outcome recorded when `end_conversation` is set.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    /// Close the conversation as ESCALATED. Mutually exclusive with
    /// [`Self::end_conversation`]; sending both is rejected with a 422.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub escalate: Option<bool>,
    /// Reason recorded when `escalate` is set.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker_name: Option<String>,
}

/// A social handle used as a customer identifier.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialHandle {
    /// The handle itself, e.g. `"@jane"`.
    pub value: String,
    /// Originating platform, e.g. `"twitter"`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureResponse {
    pub conversation_id: String,
    pub customer_id: String,
    pub capture_id: String,
    pub capture_status: String,
    pub status: String,
    pub is_new_conversation: bool,
    pub is_new_customer: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureStatusResponse {
    pub capture_id: String,
    pub status: String,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub attempts: u32,
    #[serde(default)]
    pub result: Option<serde_json::Value>,
    #[serde(default)]
    pub error: Option<String>,
}
