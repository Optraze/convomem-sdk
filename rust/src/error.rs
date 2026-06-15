
pub type Result<T, E = ConvoMemError> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum ConvoMemError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("API error {status}: {message}")]
    Api { status: u16, message: String },

    #[error("Config error: {0}")]
    Config(String),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),
}
