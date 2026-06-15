use std::fmt;

pub type Result<T> = std::result::Result<T, ConvoMemError>;

#[derive(Debug)]
pub enum ConvoMemError {
    Http(reqwest::Error),
    Api { status: u16, message: String },
    Config(String),
}

impl fmt::Display for ConvoMemError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Http(e) => write!(f, "HTTP error: {e}"),
            Self::Api { status, message } => write!(f, "API error {status}: {message}"),
            Self::Config(msg) => write!(f, "Config error: {msg}"),
        }
    }
}

impl std::error::Error for ConvoMemError {}

impl From<reqwest::Error> for ConvoMemError {
    fn from(e: reqwest::Error) -> Self {
        Self::Http(e)
    }
}

impl From<serde_json::Error> for ConvoMemError {
    fn from(e: serde_json::Error) -> Self {
        Self::Api {
            status: 0,
            message: format!("JSON parse error: {e}"),
        }
    }
}
