use serde::{Deserialize, Serialize};

use super::Memory;

/// Routing identity for any ConvoMem call.
///
/// Provide exactly one field (or `customer_id` for the most direct path).
/// When `customer_id` is set the SDK uses the `/customers/:id/…` path-based
/// route.  Otherwise the server resolves the customer from the remaining fields.
#[derive(Debug, Clone, Default)]
pub struct CustomerIdentity {
    pub customer_id: Option<String>,
    pub external_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}

impl CustomerIdentity {
    pub fn from_id(customer_id: impl Into<String>) -> Self {
        Self { customer_id: Some(customer_id.into()), ..Default::default() }
    }
    pub fn from_email(email: impl Into<String>) -> Self {
        Self { email: Some(email.into()), ..Default::default() }
    }
    pub fn from_phone(phone: impl Into<String>) -> Self {
        Self { phone: Some(phone.into()), ..Default::default() }
    }
    pub fn from_external_id(external_id: impl Into<String>) -> Self {
        Self { external_id: Some(external_id.into()), ..Default::default() }
    }
}

/// Aggregate customer statistics for the organization.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerStats {
    pub total_customers: u32,
    pub total_memories: u32,
    pub avg_memories: f64,
    pub total_conversations: u32,
    pub active7d: u32,
    pub positive: u32,
    pub neutral: u32,
    pub negative: u32,
}

/// A pair of customer profiles flagged as potential duplicates.
#[derive(Debug, Deserialize)]
pub struct MergeCandidate {
    pub customer: Customer,
    pub candidate: Customer,
    #[serde(default)]
    pub similarity: Option<f64>,
}

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

#[derive(Debug, Default, Serialize)]
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
