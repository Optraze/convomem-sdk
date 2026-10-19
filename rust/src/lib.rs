// Compile the README examples as doc tests so they cannot drift from the API.
#[doc = include_str!("../README.md")]
#[cfg(doctest)]
pub struct ReadmeDoctests;

mod client;
mod convomem;
mod error;
mod types;

pub use client::{ConvoMemClient, ConvoMemClientBuilder};
pub use convomem::{ConvoMem, ConvoMemBuilder};
pub use error::{ConvoMemError, Result};
pub use types::*;
