use serde::{Deserialize, Serialize};

/// Identity payload for a routing request.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffRouteRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}

/// The destination a routing call resolved to.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedDestination {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub value: String,
    #[serde(default)]
    pub transfer_message: Option<String>,
}

/// Resolution of where a customer's handoff should go.
///
/// A routing call never fails: an unknown customer, a missing decision, or an
/// internal error all degrade to the agent's default destination rather than
/// an error. Read [`Self::source`] to see which tier answered — `memory` is a
/// real per-customer decision, `default` is the fallback, `none` means no
/// destination is configured, and `invalid_request` means no usable identity
/// was supplied.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffRouteResponse {
    /// The chosen destination, or `None` when none is configured.
    #[serde(default)]
    pub destination: Option<ResolvedDestination>,
    /// Which tier produced this answer.
    pub source: String,
    /// Why this destination was chosen for this customer.
    #[serde(default)]
    pub reasoning: Option<String>,
    /// The resolved customer, when one was found.
    #[serde(default)]
    pub customer_id: Option<String>,
}
