use serde::{Deserialize, Serialize};

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
