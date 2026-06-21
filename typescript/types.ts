/**
 * Type definitions for the ConvoMem SDK.
 *
 * This module contains all request, response, and entity interfaces used by the
 * ConvoMem conversational memory platform. These types power the SDK's
 * customer management, conversation capture, memory retrieval, handoff,
 * insights, entity graph, webhook, and organization features.
 *
 * @module
 */

// ── Config ──────────────────────────────────────────────

/**
 * Configuration options for initializing the ConvoMem client.
 *
 * @example
 * ```ts
 * const config: ConvoMemConfig = {
 *   apiKey: "sk-org-abc123",
 *   timeout: 15000,
 *   maxRetries: 3,
 * };
 * ```
 */
export interface ConvoMemConfig {
  /** Organization API key (sk-org-...). The organization is resolved from this key. */
  apiKey: string;
  /** Custom fetch implementation (for testing or Deno Deploy) */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retries for failed requests (default: 0) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

// ── Capture ─────────────────────────────────────────────

/**
 * Request payload for capturing a conversation turn or full conversation.
 *
 * Provide either `message` (single turn) or `messages` (full conversation).
 * Customer identity can be supplied via `customerId`, `externalId`, `email`,
 * or `phoneNumber` — the API resolves the customer from whichever is provided.
 *
 * @example
 * ```ts
 * const req: CaptureRequest = {
 *   message: "I need help resetting my password",
 *   email: "alice@example.com",
 *   channel: "CHAT",
 *   idempotencyKey: "cap_abc-123",
 * };
 * ```
 */
export interface CaptureRequest {
  /** Single user message (simple form). Required if messages not provided. */
  message?: string;
  /** Full conversation turns. Required if message not provided. */
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  /** Customer UUID */
  customerId?: string;
  /** External system identifier */
  externalId?: string;
  /** Customer email */
  email?: string;
  /** Customer phone number */
  phoneNumber?: string;
  /** Customer display name */
  userName?: string;
  /** Channel (default: CHAT) */
  channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  /** Idempotency key */
  idempotencyKey?: string;
}

/**
 * Response returned after successfully capturing a conversation.
 *
 * @example
 * ```ts
 * const res: CaptureResponse = {
 *   conversationId: "conv_9f8e7d",
 *   customerId: "cust_1a2b3c",
 *   status: "new",
 *   isNewConversation: true,
 *   isNewCustomer: false,
 * };
 * ```
 */
export interface CaptureResponse {
  /** Unique identifier of the conversation */
  conversationId: string;
  /** Unique identifier of the customer */
  customerId: string;
  /** Conversation status */
  status: "new" | "active";
  /** Whether this capture created a new conversation */
  isNewConversation: boolean;
  /** Whether this capture created a new customer */
  isNewCustomer: boolean;
}

// ── Customers ───────────────────────────────────────────

/**
 * Parameters for looking up a customer by various identifiers.
 *
 * At least one identifier field should be provided. The API resolves
 * the customer using the first available identifier.
 */
export interface CustomerLookupParams {
  /** Customer UUID */
  customerId?: string;
  /** Customer phone number */
  phone?: string;
  /** Customer email address */
  email?: string;
  /** External system identifier */
  externalId?: string;
  /** Topic to scope memory retrieval */
  topic?: string;
  /** Auto-create customer if not found (default: "false") */
  autoCreate?: "true" | "false";
  /** Customer display name (used with autoCreate) */
  userName?: string;
}

/**
 * Response from a customer lookup operation.
 */
export interface CustomerLookupResponse {
  /** Whether a matching customer was found */
  found: boolean;
  /** Whether the customer was auto-created during this lookup */
  isNewCustomer?: boolean;
  /** The matched customer, or null if not found */
  customer: Customer | null;
  /** Associated memories for the customer */
  memories?: Memory[];
  /** Pre-rendered context string for LLM injection */
  context?: string;
  /** Token count of the rendered context */
  tokenCount?: number;
}

/**
 * Request payload for creating a new customer.
 */
export interface CustomerCreateRequest {
  /** Customer display name */
  name?: string;
  /** Customer email address */
  email?: string;
  /** Customer phone number */
  phone?: string;
  /** External system identifier */
  externalId?: string;
  /** Arbitrary metadata key-value pairs */
  metadata?: Record<string, unknown>;
}

/**
 * A customer entity in the ConvoMem platform.
 *
 * Customers are the central identity record. All conversations, memories,
 * and insights are linked to a customer.
 *
 * @example
 * ```ts
 * const customer: Customer = {
 *   id: "cust_1a2b3c",
 *   name: "Alice Johnson",
 *   email: "alice@example.com",
 *   lastSentiment: 0.82,
 *   memoryCount: 14,
 *   conversationCount: 5,
 *   createdAt: "2025-01-15T10:30:00Z",
 * };
 * ```
 */
export interface Customer {
  /** Unique customer identifier */
  id: string;
  /** Organization ID this customer belongs to */
  orgId?: string;
  /** Customer display name */
  name?: string;
  /** Customer email address */
  email?: string;
  /** Customer phone number */
  phone?: string;
  /** External system identifier */
  externalId?: string;
  /** Arbitrary metadata key-value pairs */
  metadata?: Record<string, unknown>;
  /** Most recent sentiment score (-1.0 to 1.0), or null if unavailable */
  lastSentiment?: number | null;
  /** Total number of memories associated with this customer */
  memoryCount?: number;
  /** Total number of conversations associated with this customer */
  conversationCount?: number;
  /** ISO 8601 timestamp of last contact, or null if never contacted */
  lastContactAt?: string | null;
  /** ISO 8601 timestamp of customer creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last update */
  updatedAt?: string;
}

/**
 * Paginated list of customers.
 */
export interface CustomerListResponse {
  /** Array of customer records */
  customers: Customer[];
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items per page */
  limit: number;
  /** Total number of matching customers */
  total: number;
}

/**
 * Request payload for updating an existing customer.
 */
export interface CustomerUpdateRequest {
  /** Customer display name */
  name?: string;
  /** Customer email address */
  email?: string;
  /** Customer phone number */
  phone?: string;
  /** External system identifier */
  externalId?: string;
  /** Arbitrary metadata key-value pairs (merged with existing) */
  metadata?: Record<string, unknown>;
}

// ── Handoff ─────────────────────────────────────────────

/**
 * Parameters for generating a handoff summary for a customer.
 *
 * The handoff endpoint produces a structured briefing that helps a new agent
 * quickly understand the customer's history, sentiment, and open issues.
 */
export interface HandoffParams {
  /** Customer UUID */
  customerId?: string;
  /** Customer phone number */
  phone?: string;
  /** Customer email address */
  email?: string;
  /** External system identifier */
  externalId?: string;
  /** Whether to include a narrative summary (default: "true") */
  narrative?: "true" | "false";
  /** Whether to generate a fresh (non-cached) summary (default: "false") */
  fresh?: "true" | "false";
}

/**
 * Structured handoff briefing for transitioning a customer to a new agent.
 *
 * Contains the customer record, conversation journey, key memories,
 * sentiment trend, open issue status, and an optional LLM-generated narrative.
 *
 * @example
 * ```ts
 * const handoff: HandoffResponse = {
 *   found: true,
 *   customer: { id: "cust_1a2b3c", name: "Alice" },
 *   journey: [
 *     {
 *       conversationId: "conv_abc",
 *       channel: "CHAT",
 *       status: "COMPLETED",
 *       summary: "Password reset request",
 *       outcome: "resolved",
 *       sentiment: 0.6,
 *     },
 *   ],
 *   keyMemories: [
 *     { content: "Prefers email over phone", category: "preference" },
 *   ],
 *   sentimentTrend: { direction: "improving", current: 0.75 },
 *   openIssue: { isOpen: false, reason: null, summary: null },
 *   narrative: "Alice is a returning customer who recently had a password reset.",
 *   narrativeSource: "llm",
 * };
 * ```
 */
export interface HandoffResponse {
  /** Whether a matching customer was found */
  found: boolean;
  /** The matched customer, or null if not found */
  customer: Customer | null;
  /** Chronological list of conversation entries */
  journey: JourneyEntry[];
  /** Most important memories for this customer */
  keyMemories: KeyMemory[];
  /** Sentiment trend over time */
  sentimentTrend: {
    /** Trend direction */
    direction: "declining" | "improving" | "stable" | "unknown";
    /** Most recent sentiment score, or null if unavailable */
    current: number | null;
    /** Optional array of historical sentiment data points */
    points?: Array<{ timestamp: string; score: number }>;
  };
  /** Current open issue status */
  openIssue: {
    /** Whether there is an unresolved issue */
    isOpen: boolean;
    /** Reason code for the open issue, or null if none */
    reason: "ESCALATED" | "ACTIVE" | "OUTCOME_UNRESOLVED" | null;
    /** Human-readable summary of the open issue, or null if none */
    summary: string | null;
  };
  /** LLM-generated narrative summary, or null if unavailable */
  narrative: string | null;
  /** Source of the narrative: "llm", "fallback", or "skipped" */
  narrativeSource: "llm" | "fallback" | "skipped";
  /** ISO 8601 timestamp of when this handoff was generated */
  generatedAt?: string;
  /** Whether this response was served from cache */
  cached?: boolean;
}

/**
 * A single entry in the customer's conversation journey.
 */
export interface JourneyEntry {
  /** Conversation identifier */
  conversationId?: string;
  /** Communication channel */
  channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  /** Conversation status */
  status: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
  /** Brief summary of the conversation */
  summary: string | null;
  /** Conversation outcome, or null if not yet determined */
  outcome: string | null;
  /** Sentiment score for this conversation, or null if unavailable */
  sentiment: number | null;
  /** ISO 8601 timestamp of conversation start */
  startedAt?: string;
  /** ISO 8601 timestamp of conversation end, or null if still active */
  endedAt?: string | null;
  /** Number of messages in the conversation */
  messagesCount?: number;
}

/**
 * A key memory surfaced during handoff.
 */
export interface KeyMemory {
  /** Memory identifier */
  id?: string;
  /** Memory content / fact text */
  content: string;
  /** Memory category (e.g. "preference", "issue", "purchase") */
  category: string;
  /** Channel where this memory was captured, or null if unknown */
  channelSource: string | null;
  /** Memory type classification */
  memoryType?: string;
  /** Sentiment associated with this memory, or null if unavailable */
  sentiment?: string | null;
}

// ── Memories ────────────────────────────────────────────

/**
 * A memory record representing a fact or preference extracted from conversations.
 *
 * Memories are the core unit of the ConvoMem platform. They are automatically
 * extracted from conversations and can be searched, updated, and injected
 * into LLM context.
 *
 * @example
 * ```ts
 * const memory: Memory = {
 *   id: "mem_abc123",
 *   content: "Customer prefers email communication over phone",
 *   category: "preference",
 *   memoryType: "preference",
 *   confidence: 0.9,
 *   sentiment: "positive",
 *   isSensitive: false,
 *   createdAt: "2025-03-10T14:22:00Z",
 * };
 * ```
 */
export interface Memory {
  /** Unique memory identifier */
  id: string;
  /** Memory content text */
  content?: string;
  /** Memory category (e.g. "preference", "issue", "purchase") */
  category?: string;
  /** Memory type classification */
  memoryType?: string;
  /** Importance score (0.0 to 1.0) */
  importance?: number;
  /** Relevance score for the current query context (0.0 to 1.0) */
  relevance?: number;
  /** Combined relevance score */
  score?: number;
  /** Sentiment associated with this memory, or null if unavailable */
  sentiment?: string | null;
  /** Original conversation context where this memory was extracted, or null */
  sourceContext?: string | null;
  /** Topic key for scoped retrieval */
  topicKey?: string;
  /** Durability score indicating how long-lasting this fact is (0.0 to 1.0) */
  durability?: number;
  /** Confidence score for the extracted fact (0.0 to 1.0) */
  confidence?: number;
  /** Number of times this memory has been confirmed across conversations */
  confirmationCount?: number;
  /** Whether this memory contains sensitive information */
  isSensitive?: boolean;
  /** Platform or channel where this memory originated */
  platform?: string;
  /** Search tags for improved retrieval */
  searchTags?: string[];
  /** ISO 8601 timestamp of memory creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last update */
  updatedAt?: string;
}

/**
 * Request payload for ingesting memories from a conversation.
 */
export interface MemoryIngestRequest {
  /** Conversation messages to extract memories from */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Communication channel (default: CHAT) */
  channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL";
}

/**
 * Parameters for looking up memories by topic and customer.
 */
export interface MemoryLookupParams {
  /** Topic to search memories for */
  topic: string;
  /** Customer phone number */
  phone?: string;
  /** Customer email address */
  email?: string;
  /** External system identifier */
  externalId?: string;
}

/**
 * Pre-rendered memory context for LLM injection.
 */
export interface MemoryContext {
  /** Rendered context string ready for LLM prompt injection */
  context: string;
  /** Token count of the rendered context */
  tokenCount: number;
  /** Individual memory records included in the context */
  memories: Memory[];
}

/**
 * Paginated list of memories.
 */
export interface MemoryListResponse {
  /** Array of memory records */
  memories: Memory[];
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items per page */
  limit: number;
  /** Total number of matching memories */
  total: number;
}

/**
 * Request payload for updating an existing memory.
 */
export interface MemoryUpdateRequest {
  /** Updated memory content text */
  content?: string;
  /** Updated category */
  category?: string;
}

/**
 * Request payload for manually adding a memory.
 */
export interface MemoryAddRequest {
  /** Memory content text */
  content: string;
  /** Memory category */
  category?: string;
}

/**
 * Parameters for looking up feedback-associated memories.
 */
export interface FeedbackLookupRequest {
  /** Customer UUID */
  customerId?: string;
  /** Customer phone number */
  phone?: string;
  /** Customer email address */
  email?: string;
  /** External system identifier */
  externalId?: string;
  /** Topic to scope the lookup */
  topic?: string;
}

/**
 * Response from a feedback lookup operation.
 */
export interface FeedbackLookupResponse {
  /** Whether feedback was found for the customer */
  found: boolean;
  /** Feedback data as key-value pairs */
  feedback?: Record<string, unknown>;
  /** Memories associated with the feedback */
  memories?: Memory[];
}

// ── Conversations ───────────────────────────────────────

/**
 * A conversation record in the ConvoMem platform.
 *
 * Conversations track interactions across channels and are linked to customers.
 * Each conversation has a lifecycle from ACTIVE through COMPLETED, ESCALATED,
 * or ABANDONED.
 *
 * @example
 * ```ts
 * const conversation: Conversation = {
 *   id: "conv_9f8e7d",
 *   customerId: "cust_1a2b3c",
 *   channel: "CHAT",
 *   status: "ACTIVE",
 *   startedAt: "2025-06-15T10:00:00Z",
 * };
 * ```
 */
export interface Conversation {
  /** Unique conversation identifier */
  id: string;
  /** Customer UUID this conversation belongs to */
  customerId?: string;
  /** Communication channel */
  channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  /** Conversation status */
  status: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
  /** ISO 8601 timestamp of conversation start */
  startedAt?: string;
  /** ISO 8601 timestamp of conversation end, or null if still active */
  endedAt?: string | null;
}

/**
 * Paginated list of conversations.
 */
export interface ConversationListResponse {
  /** Array of conversation records */
  conversations: Conversation[];
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items per page */
  limit: number;
  /** Total number of matching conversations */
  total: number;
}

/**
 * Request payload for ending a conversation.
 */
export interface ConversationEndRequest {
  /** Outcome description (e.g. "resolved", "customer_hung_up") */
  outcome?: string;
}

/**
 * Response returned after ending a conversation.
 */
export interface ConversationEndResponse {
  /** Conversation identifier */
  id: string;
  /** Conversation status after ending */
  status: "COMPLETED";
  /** ISO 8601 timestamp of conversation end */
  endedAt?: string;
}

/**
 * Request payload for escalating a conversation.
 */
export interface ConversationEscalateRequest {
  /** Reason for escalation */
  reason?: string;
}

/**
 * Response returned after escalating a conversation.
 */
export interface ConversationEscalateResponse {
  /** Conversation identifier */
  id: string;
  /** Conversation status after escalation */
  status: "ESCALATED";
}

// ── Embed ───────────────────────────────────────────────

/**
 * Request payload for generating an embeddable customer token.
 */
export interface EmbedTokenRequest {
  /** Customer UUID */
  customerId?: string;
  /** External system identifier */
  externalId?: string;
  /** Customer email address */
  email?: string;
  /** Customer phone number */
  phone?: string;
  /** Token time-to-live in seconds (default: 3600) */
  ttlSeconds?: number;
}

/**
 * Response containing an embeddable customer token.
 */
export interface EmbedTokenResponse {
  /** The generated token string */
  token: string;
  /** Token lifetime in seconds */
  expiresIn: number;
  /** Token scope (e.g. "customer") */
  scope: string;
}

// ── Identity ────────────────────────────────────────────

/**
 * Customer identity selector.
 *
 * Pass any one field to identify the customer. The API resolves the customer
 * using the priority chain: `customerId` → `externalId` → `email` → `phone`.
 */
export interface CustomerIdentity {
  /** ConvoMem customer UUID */
  customerId?: string;
  /** Your CRM / external system ID */
  externalId?: string;
  /** Customer email address */
  email?: string;
  /** Customer phone number (E.164 preferred, e.g. +14155550101) */
  phone?: string;
}

// ── Stats & merge candidates ─────────────────────────────

/**
 * Aggregate customer statistics for the organization.
 */
export interface CustomerStats {
  /** Total number of customers */
  totalCustomers: number;
  /** Total number of memories stored */
  totalMemories: number;
  /** Average memories per customer */
  avgMemories: number;
  /** Total number of conversations */
  totalConversations: number;
  /** Customers active in the last 7 days */
  active7d: number;
  /** Number of customers with positive sentiment */
  positive: number;
  /** Number of customers with neutral sentiment */
  neutral: number;
  /** Number of customers with negative sentiment */
  negative: number;
}

/**
 * A pair of customer profiles flagged as potential duplicates.
 */
export interface MergeCandidate {
  /** Primary customer record */
  customer: Customer;
  /** Candidate duplicate customer record */
  candidate: Customer;
  /** Similarity score (0.0 to 1.0) */
  similarity?: number;
}
