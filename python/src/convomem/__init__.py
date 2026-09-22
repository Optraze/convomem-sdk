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
    CaptureStatusResponse,
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
    CustomerUpdateRequest,
    EmbedTokenRequest,
    EmbedTokenResponse,
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
    Message,
    OpenIssue,
    SentimentPoint,
    SentimentTrend,
)
from convomem.convomem import AsyncConvoMem, ConvoMem

__all__ = [  # noqa: RUF022 - grouped by public API area
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
    "CaptureStatusResponse",
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
    "CustomerUpdateRequest",
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
    "Memory",
    "MemoryAddRequest",
    "MemoryContext",
    "MemoryIngestRequest",
    "MemoryListResponse",
    "MemoryLookupParams",
    "MemoryUpdateRequest",
    "Message",
]

__version__ = "0.3.0"
