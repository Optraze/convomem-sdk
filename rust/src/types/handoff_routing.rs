use serde::{Deserialize, Serialize};

/// A place a live call can be transferred to.
///
/// Destinations are configured per agent. `description` is the field that does
/// the work: it is what the model reads when deciding which destination suits
/// a given customer, so write it as a plain-English rule rather than a label.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffDestination {
    pub id: String,
    /// Human-readable name, e.g. `"Senior Support"`.
    pub name: String,
    /// Transport type: `PHONE` or `SIP`.
    pub r#type: String,
    /// E.164 number for `PHONE`, or a `sip:`/`sips:` URI for `SIP`.
    pub value: String,
    /// When handoffs should go here — read by the model when routing.
    #[serde(default)]
    pub description: Option<String>,
    /// Spoken to the caller just before the transfer connects.
    #[serde(default)]
    pub transfer_message: Option<String>,
    /// Whether this is the agent's fallback destination.
    #[serde(default)]
    pub is_default: bool,
    /// Inactive destinations are never chosen.
    #[serde(default)]
    pub is_active: bool,
    /// Channel the destination serves. Only `VOICE` is accepted today.
    #[serde(default)]
    pub channel: Option<String>,
}

/// Request payload for creating or updating a handoff destination.
///
/// The first destination created for an agent becomes its default
/// automatically — resolution always needs somewhere to fall back to.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffDestinationRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// `PHONE` or `SIP`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    /// When handoffs should go here — this is what the model reads.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transfer_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_default: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_active: Option<bool>,
}

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
