"""ConvoMem Python SDK — the official client library for the ConvoMem API."""

from convomem._async_client import AsyncConvoMemClient
from convomem._client import ConvoMemClient
from convomem._errors import (
    ConvoMemApiError,
    ConvoMemConfigError,
    ConvoMemError,
    ConvoMemTimeoutError,
)
from convomem._types import (
    CaptureRequest,
    CaptureResponse,
    Conversation,
    ConversationEndRequest,
    ConversationEscalateRequest,
    ConversationListResponse,
    Customer,
    CustomerCreateRequest,
    CustomerIdentity,
    CustomerListResponse,
    CustomerLookupParams,
    CustomerLookupResponse,
    CustomerStats,
    CustomerUpdateRequest,
    EmbedTokenRequest,
    EmbedTokenResponse,
    FeedbackLookupRequest,
    FeedbackLookupResponse,
    HandoffParams,
    HandoffResponse,
    JourneyEntry,
    KeyMemory,
    Memory,
    MemoryAddRequest,
    MemoryContext,
    MemoryIngestRequest,
    MemoryListResponse,
    MemoryLookupParams,
    MemoryUpdateRequest,
    MergeCandidate,
    Message,
    OpenIssue,
    SentimentPoint,
    SentimentTrend,
)
from convomem.convomem import AsyncConvoMem, ConvoMem

__all__ = [
    # Primary clients
    "ConvoMem",
    "AsyncConvoMem",
    # Advanced / resource-based clients
    "ConvoMemClient",
    "AsyncConvoMemClient",
    # Identity
    "CustomerIdentity",
    # Errors
    "ConvoMemApiError",
    "ConvoMemConfigError",
    "ConvoMemError",
    "ConvoMemTimeoutError",
    # Capture
    "CaptureRequest",
    "CaptureResponse",
    # Conversations
    "Conversation",
    "ConversationEndRequest",
    "ConversationEscalateRequest",
    "ConversationListResponse",
    # Customers
    "Customer",
    "CustomerCreateRequest",
    "CustomerListResponse",
    "CustomerLookupParams",
    "CustomerLookupResponse",
    "CustomerStats",
    "CustomerUpdateRequest",
    "MergeCandidate",
    # Embed
    "EmbedTokenRequest",
    "EmbedTokenResponse",
    # Handoff
    "HandoffParams",
    "HandoffResponse",
    "JourneyEntry",
    "KeyMemory",
    "OpenIssue",
    "SentimentPoint",
    "SentimentTrend",
    # Memories
    "FeedbackLookupRequest",
    "FeedbackLookupResponse",
    "Memory",
    "MemoryAddRequest",
    "MemoryContext",
    "MemoryIngestRequest",
    "MemoryListResponse",
    "MemoryLookupParams",
    "MemoryUpdateRequest",
    "Message",
]

__version__ = "0.2.0"
