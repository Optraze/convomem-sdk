"""Pydantic v2 type models for the ConvoMem API.

All models use camelCase aliases to match the JSON API contract.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# ── Identity ─────────────────────────────────────────────


@dataclass
class CustomerIdentity:
    """Routing identity for any ConvoMem call.

    Supply exactly one field (or ``customer_id`` for the fastest path).
    When ``customer_id`` is given the SDK uses the ``/customers/:id/…``
    path-based route.  Otherwise the server resolves the customer from the
    remaining fields.
    """

    customer_id: str | None = None
    external_id: str | None = None
    email: str | None = None
    phone: str | None = None


# ── Config ──────────────────────────────────────────────



# ── Capture ─────────────────────────────────────────────


class Message(BaseModel):
    """A single message in a conversation."""

    model_config = ConfigDict(populate_by_name=True)

    role: Literal["user", "assistant", "system"]
    """Message role."""

    content: str
    """Message content text."""


class CaptureRequest(BaseModel):
    """Request payload for capturing a conversation turn or full conversation."""

    model_config = ConfigDict(populate_by_name=True)

    message: str | None = Field(default=None, alias="message")
    """Single user message (simple form). Required if messages not provided."""

    messages: list[Message] | None = Field(default=None, alias="messages")
    """Full conversation turns. Required if message not provided."""

    customer_id: str | None = Field(default=None, alias="customerId")
    """Customer UUID."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    email: str | None = Field(default=None, alias="email")
    """Customer email."""

    phone_number: str | None = Field(default=None, alias="phoneNumber")
    """Customer phone number."""

    user_name: str | None = Field(default=None, alias="userName")
    """Customer display name."""

    channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"] | None = Field(default=None, alias="channel")
    """Communication channel (default: CHAT)."""

    idempotency_key: str | None = Field(default=None, alias="idempotencyKey")
    """Idempotency key."""


class CaptureResponse(BaseModel):
    """Response returned after successfully capturing a conversation."""

    model_config = ConfigDict(populate_by_name=True)

    conversation_id: str = Field(alias="conversationId")
    """Unique identifier of the conversation."""

    customer_id: str = Field(alias="customerId")
    """Unique identifier of the customer."""

    status: Literal["new", "active"]
    """Conversation status."""

    is_new_conversation: bool = Field(alias="isNewConversation")
    """Whether this capture created a new conversation."""

    is_new_customer: bool = Field(alias="isNewCustomer")
    """Whether this capture created a new customer."""


# ── Customers ───────────────────────────────────────────


class Customer(BaseModel):
    """A customer entity in the ConvoMem platform.

    Customers are the central identity record. All conversations, memories,
    and insights are linked to a customer.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str
    """Unique customer identifier."""

    org_id: str | None = Field(default=None, alias="orgId")
    """Organization ID this customer belongs to."""

    name: str | None = Field(default=None, alias="name")
    """Customer display name."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    metadata: dict[str, Any] | None = Field(default=None, alias="metadata")
    """Arbitrary metadata key-value pairs."""

    last_sentiment: float | None = Field(default=None, alias="lastSentiment")
    """Most recent sentiment score (-1.0 to 1.0), or None if unavailable."""

    memory_count: int | None = Field(default=None, alias="memoryCount")
    """Total number of memories associated with this customer."""

    conversation_count: int | None = Field(default=None, alias="conversationCount")
    """Total number of conversations associated with this customer."""

    last_contact_at: str | None = Field(default=None, alias="lastContactAt")
    """ISO 8601 timestamp of last contact, or None if never contacted."""

    created_at: str | None = Field(default=None, alias="createdAt")
    """ISO 8601 timestamp of customer creation."""

    updated_at: str | None = Field(default=None, alias="updatedAt")
    """ISO 8601 timestamp of last update."""


class CustomerCreateRequest(BaseModel):
    """Request payload for creating a new customer."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(default=None, alias="name")
    """Customer display name."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    metadata: dict[str, Any] | None = Field(default=None, alias="metadata")
    """Arbitrary metadata key-value pairs."""


class CustomerUpdateRequest(BaseModel):
    """Request payload for updating an existing customer."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(default=None, alias="name")
    """Customer display name."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    metadata: dict[str, Any] | None = Field(default=None, alias="metadata")
    """Arbitrary metadata key-value pairs (merged with existing)."""


class CustomerLookupParams(BaseModel):
    """Parameters for looking up a customer by various identifiers."""

    model_config = ConfigDict(populate_by_name=True)

    customer_id: str | None = Field(default=None, alias="customerId")
    """Customer UUID."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    topic: str | None = Field(default=None, alias="topic")
    """Topic to scope memory retrieval."""

    auto_create: Literal["true", "false"] | None = Field(default=None, alias="autoCreate")
    """Auto-create customer if not found (default: "false")."""

    user_name: str | None = Field(default=None, alias="userName")
    """Customer display name (used with autoCreate)."""


class CustomerLookupResponse(BaseModel):
    """Response from a customer lookup operation."""

    model_config = ConfigDict(populate_by_name=True)

    found: bool
    """Whether a matching customer was found."""

    is_new_customer: bool | None = Field(default=None, alias="isNewCustomer")
    """Whether the customer was auto-created during this lookup."""

    customer: Customer | None = Field(default=None, alias="customer")
    """The matched customer, or None if not found."""

    memories: list[Memory] | None = Field(default=None, alias="memories")
    """Associated memories for the customer."""

    context: str | None = Field(default=None, alias="context")
    """Pre-rendered context string for LLM injection."""

    token_count: int | None = Field(default=None, alias="tokenCount")
    """Token count of the rendered context."""


class CustomerListResponse(BaseModel):
    """Paginated list of customers."""

    model_config = ConfigDict(populate_by_name=True)

    customers: list[Customer]
    """Array of customer records."""

    page: int
    """Current page number (1-indexed)."""

    limit: int
    """Maximum items per page."""

    total: int
    """Total number of matching customers."""


class CustomerStats(BaseModel):
    """Aggregate customer statistics for the organization."""

    model_config = ConfigDict(populate_by_name=True)

    total_customers: int = Field(alias="totalCustomers")
    """Total number of customers."""

    total_memories: int = Field(alias="totalMemories")
    """Total number of memories."""

    avg_memories: float = Field(alias="avgMemories")
    """Average memories per customer."""

    total_conversations: int = Field(alias="totalConversations")
    """Total number of conversations."""

    active7d: int
    """Customers active in the last 7 days."""

    positive: int
    """Customers with positive sentiment."""

    neutral: int
    """Customers with neutral sentiment."""

    negative: int
    """Customers with negative sentiment."""


class MergeCandidate(BaseModel):
    """A pair of customer profiles flagged as potential duplicates."""

    model_config = ConfigDict(populate_by_name=True)

    customer: Customer
    """Primary customer record."""

    candidate: Customer
    """Potential duplicate customer record."""

    similarity: float | None = None
    """Similarity score (0.0 to 1.0), or None if unavailable."""


# ── Handoff ─────────────────────────────────────────────


class HandoffParams(BaseModel):
    """Parameters for generating a handoff summary for a customer."""

    model_config = ConfigDict(populate_by_name=True)

    customer_id: str | None = Field(default=None, alias="customerId")
    """Customer UUID."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    narrative: Literal["true", "false"] | None = Field(default=None, alias="narrative")
    """Whether to include a narrative summary (default: "true")."""

    fresh: Literal["true", "false"] | None = Field(default=None, alias="fresh")
    """Whether to generate a fresh (non-cached) summary (default: "false")."""


class JourneyEntry(BaseModel):
    """A single entry in the customer's conversation journey."""

    model_config = ConfigDict(populate_by_name=True)

    conversation_id: str | None = Field(default=None, alias="conversationId")
    """Conversation identifier."""

    channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"]
    """Communication channel."""

    status: Literal["ACTIVE", "COMPLETED", "ESCALATED", "ABANDONED"]
    """Conversation status."""

    summary: str | None = Field(default=None, alias="summary")
    """Brief summary of the conversation."""

    outcome: str | None = Field(default=None, alias="outcome")
    """Conversation outcome, or None if not yet determined."""

    sentiment: float | None = Field(default=None, alias="sentiment")
    """Sentiment score for this conversation, or None if unavailable."""

    started_at: str | None = Field(default=None, alias="startedAt")
    """ISO 8601 timestamp of conversation start."""

    ended_at: str | None = Field(default=None, alias="endedAt")
    """ISO 8601 timestamp of conversation end, or None if still active."""

    messages_count: int | None = Field(default=None, alias="messagesCount")
    """Number of messages in the conversation."""


class KeyMemory(BaseModel):
    """A key memory surfaced during handoff."""

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, alias="id")
    """Memory identifier."""

    content: str
    """Memory content / fact text."""

    category: str
    """Memory category (e.g. "preference", "issue", "purchase")."""

    channel_source: str | None = Field(default=None, alias="channelSource")
    """Channel where this memory was captured, or None if unknown."""

    memory_type: str | None = Field(default=None, alias="memoryType")
    """Memory type classification."""

    sentiment: str | None = Field(default=None, alias="sentiment")
    """Sentiment associated with this memory, or None if unavailable."""


class SentimentPoint(BaseModel):
    """A single data point in a sentiment time series."""

    model_config = ConfigDict(populate_by_name=True)

    timestamp: str
    """ISO 8601 timestamp of the data point."""

    score: float
    """Sentiment score (-1.0 to 1.0)."""

    count: int | None = Field(default=None, alias="count")
    """Number of conversations contributing to this data point."""


class SentimentTrend(BaseModel):
    """Sentiment trend over time for a customer."""

    model_config = ConfigDict(populate_by_name=True)

    direction: Literal["declining", "improving", "stable", "unknown"]
    """Trend direction."""

    current: float | None = Field(default=None, alias="current")
    """Most recent sentiment score, or None if unavailable."""

    points: list[SentimentPoint] | None = Field(default=None, alias="points")
    """Optional array of historical sentiment data points."""


class OpenIssue(BaseModel):
    """Current open issue status for a customer."""

    model_config = ConfigDict(populate_by_name=True)

    is_open: bool = Field(alias="isOpen")
    """Whether there is an unresolved issue."""

    reason: Literal["ESCALATED", "ACTIVE", "OUTCOME_UNRESOLVED"] | None = Field(
        default=None, alias="reason"
    )
    """Reason code for the open issue, or None if none."""

    summary: str | None = Field(default=None, alias="summary")
    """Human-readable summary of the open issue, or None if none."""


class HandoffResponse(BaseModel):
    """Structured handoff briefing for transitioning a customer to a new agent.

    Contains the customer record, conversation journey, key memories,
    sentiment trend, open issue status, and an optional LLM-generated narrative.
    """

    model_config = ConfigDict(populate_by_name=True)

    found: bool
    """Whether a matching customer was found."""

    customer: Customer | None = Field(default=None, alias="customer")
    """The matched customer, or None if not found."""

    journey: list[JourneyEntry]
    """Chronological list of conversation entries."""

    key_memories: list[KeyMemory] = Field(alias="keyMemories")
    """Most important memories for this customer."""

    sentiment_trend: SentimentTrend = Field(alias="sentimentTrend")
    """Sentiment trend over time."""

    open_issue: OpenIssue = Field(alias="openIssue")
    """Current open issue status."""

    narrative: str | None = Field(default=None, alias="narrative")
    """LLM-generated narrative summary, or None if unavailable."""

    narrative_source: Literal["llm", "fallback", "skipped"] = Field(alias="narrativeSource")
    """Source of the narrative: "llm", "fallback", or "skipped"."""

    generated_at: str | None = Field(default=None, alias="generatedAt")
    """ISO 8601 timestamp of when this handoff was generated."""

    cached: bool | None = Field(default=None, alias="cached")
    """Whether this response was served from cache."""


# ── Memories ────────────────────────────────────────────


class Memory(BaseModel):
    """A memory record representing a fact or preference extracted from conversations."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    """Unique memory identifier."""

    content: str | None = Field(default=None, alias="content")
    """Full memory content text."""

    fact: str | None = Field(default=None, alias="fact")
    """Concise fact extracted from the memory."""

    category: str | None = Field(default=None, alias="category")
    """Memory category (e.g. "preference", "issue", "purchase")."""

    memory_type: str | None = Field(default=None, alias="memoryType")
    """Memory type classification."""

    importance: float | None = Field(default=None, alias="importance")
    """Importance score (0.0 to 1.0)."""

    relevance: float | None = Field(default=None, alias="relevance")
    """Relevance score for the current query context (0.0 to 1.0)."""

    score: float | None = Field(default=None, alias="score")
    """Combined relevance score."""

    sentiment: str | None = Field(default=None, alias="sentiment")
    """Sentiment associated with this memory, or None if unavailable."""

    source_context: str | None = Field(default=None, alias="sourceContext")
    """Original conversation context where this memory was extracted, or None."""

    topic_key: str | None = Field(default=None, alias="topicKey")
    """Topic key for scoped retrieval."""

    durability: float | None = Field(default=None, alias="durability")
    """Durability score indicating how long-lasting this fact is (0.0 to 1.0)."""

    confidence: float | None = Field(default=None, alias="confidence")
    """Confidence score for the extracted fact (0.0 to 1.0)."""

    confirmation_count: int | None = Field(default=None, alias="confirmationCount")
    """Number of times this memory has been confirmed across conversations."""

    is_sensitive: bool | None = Field(default=None, alias="isSensitive")
    """Whether this memory contains sensitive information."""

    platform: str | None = Field(default=None, alias="platform")
    """Platform or channel where this memory originated."""

    search_tags: list[str] | None = Field(default=None, alias="searchTags")
    """Search tags for improved retrieval."""

    created_at: str | None = Field(default=None, alias="createdAt")
    """ISO 8601 timestamp of memory creation."""

    updated_at: str | None = Field(default=None, alias="updatedAt")
    """ISO 8601 timestamp of last update."""


class MemoryIngestRequest(BaseModel):
    """Request payload for ingesting memories from a conversation."""

    model_config = ConfigDict(populate_by_name=True)

    messages: list[Message]
    """Conversation messages to extract memories from."""

    channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"] | None = Field(default=None, alias="channel")
    """Communication channel (default: CHAT)."""


class MemoryIngestResponse(BaseModel):
    """Response from memory ingestion."""

    model_config = ConfigDict(populate_by_name=True)

    capture_id: str = Field(alias="captureId")
    """Capture ID for tracking async processing."""

    status: str
    """Processing status (e.g., 'queued')."""


class MemoryLookupParams(BaseModel):
    """Parameters for looking up memories by topic and customer."""

    model_config = ConfigDict(populate_by_name=True)

    topic: str
    """Topic to search memories for."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""


class MemoryContext(BaseModel):
    """Pre-rendered memory context for LLM injection."""

    model_config = ConfigDict(populate_by_name=True)

    context: str
    """Rendered context string ready for LLM prompt injection."""

    token_count: int = Field(alias="tokenCount")
    """Token count of the rendered context."""

    memories: list[Memory]
    """Individual memory records included in the context."""


class MemoryListResponse(BaseModel):
    """Paginated list of memories."""

    model_config = ConfigDict(populate_by_name=True)

    memories: list[Memory]
    """Array of memory records."""

    page: int
    """Current page number (1-indexed)."""

    limit: int
    """Maximum items per page."""

    total: int
    """Total number of matching memories."""


class MemoryUpdateRequest(BaseModel):
    """Request payload for updating an existing memory."""

    model_config = ConfigDict(populate_by_name=True)

    content: str | None = Field(default=None, alias="content")
    """Updated memory text."""

    category: str | None = Field(default=None, alias="category")
    """Updated category."""

    importance: float | None = Field(default=None, alias="importance")
    """Updated importance score (0.0 to 1.0)."""


class MemoryAddRequest(BaseModel):
    """Request payload for manually adding a memory."""

    model_config = ConfigDict(populate_by_name=True)

    content: str
    """Memory text to store."""

    category: str | None = Field(default=None, alias="category")
    """Memory category."""

    importance: float | None = Field(default=None, alias="importance")
    """Importance score (0.0 to 1.0)."""

    memory_type: str | None = Field(default=None, alias="memoryType")
    """Memory type classification."""


class FeedbackLookupRequest(BaseModel):
    """Parameters for looking up feedback-associated memories."""

    model_config = ConfigDict(populate_by_name=True)

    customer_id: str | None = Field(default=None, alias="customerId")
    """Customer UUID."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    topic: str | None = Field(default=None, alias="topic")
    """Topic to scope the lookup."""


class FeedbackLookupResponse(BaseModel):
    """Response from a feedback lookup operation."""

    model_config = ConfigDict(populate_by_name=True)

    found: bool
    """Whether feedback was found for the customer."""

    feedback: dict[str, Any] | None = Field(default=None, alias="feedback")
    """Feedback data as key-value pairs."""

    memories: list[Memory] | None = Field(default=None, alias="memories")
    """Memories associated with the feedback."""


# ── Conversations ───────────────────────────────────────


class Conversation(BaseModel):
    """A conversation record in the ConvoMem platform."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    """Unique conversation identifier."""

    customer_id: str | None = Field(default=None, alias="customerId")
    """Customer UUID this conversation belongs to."""

    channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"]
    """Communication channel."""

    status: Literal["ACTIVE", "COMPLETED", "ESCALATED", "ABANDONED"]
    """Conversation status."""

    started_at: str | None = Field(default=None, alias="startedAt")
    """ISO 8601 timestamp of conversation start."""

    ended_at: str | None = Field(default=None, alias="endedAt")
    """ISO 8601 timestamp of conversation end, or None if still active."""


class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""

    model_config = ConfigDict(populate_by_name=True)

    conversations: list[Conversation]
    """Array of conversation records."""

    page: int
    """Current page number (1-indexed)."""

    limit: int
    """Maximum items per page."""

    total: int
    """Total number of matching conversations."""


class ConversationEndRequest(BaseModel):
    """Request to end a conversation."""

    model_config = ConfigDict(populate_by_name=True)

    outcome: str | None = None
    """Outcome of the conversation."""



class ConversationEscalateRequest(BaseModel):
    """Request to escalate a conversation."""

    model_config = ConfigDict(populate_by_name=True)

    reason: str | None = None
    """Reason for escalation."""



# ── Embed ───────────────────────────────────────────────


class EmbedTokenRequest(BaseModel):
    """Request payload for generating an embeddable customer token."""

    model_config = ConfigDict(populate_by_name=True)

    customer_id: str | None = Field(default=None, alias="customerId")
    """Customer UUID."""

    external_id: str | None = Field(default=None, alias="externalId")
    """External system identifier."""

    email: str | None = Field(default=None, alias="email")
    """Customer email address."""

    phone: str | None = Field(default=None, alias="phone")
    """Customer phone number."""

    ttl_seconds: int | None = Field(default=None, alias="ttlSeconds")
    """Token time-to-live in seconds (default: 3600)."""


class EmbedTokenResponse(BaseModel):
    """Response containing an embeddable customer token."""

    model_config = ConfigDict(populate_by_name=True)

    token: str
    """The generated token string."""

    expires_in: int = Field(alias="expiresIn")
    """Token lifetime in seconds."""

    scope: str
    """Token scope (e.g. "customer")."""


# (Admin-scope types removed: Entity, Org, Webhook, Insights.
#  Integration API keys cannot call those endpoints.)
