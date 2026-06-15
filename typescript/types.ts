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
  /** Override base URL (default: https://api.convomem.com/api/v1) */
  baseUrl?: string;
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
 *   fact: "Prefers email communication over phone",
 *   category: "preference",
 *   memoryType: "preference",
 *   importance: 0.8,
 *   sentiment: "positive",
 *   isSensitive: false,
 *   createdAt: "2025-03-10T14:22:00Z",
 * };
 * ```
 */
export interface Memory {
  /** Unique memory identifier */
  id: string;
  /** Full memory content text */
  content?: string;
  /** Concise fact extracted from the memory */
  fact?: string;
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
  /** Updated fact text */
  fact?: string;
  /** Updated category */
  category?: string;
  /** Updated importance score (0.0 to 1.0) */
  importance?: number;
}

/**
 * Request payload for manually adding a memory.
 */
export interface MemoryAddRequest {
  /** Fact text to store */
  fact: string;
  /** Memory category */
  category?: string;
  /** Importance score (0.0 to 1.0) */
  importance?: number;
  /** Memory type classification */
  memoryType?: string;
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

// ── Entities ────────────────────────────────────────────

/**
 * An entity in the knowledge graph.
 *
 * Entities represent real-world objects (companies, products, people) that
 * are linked to customers and memories through relationships.
 */
export interface Entity {
  /** Unique entity identifier */
  id: string;
  /** Organization ID this entity belongs to */
  orgId?: string;
  /** Entity name */
  name: string;
  /** Entity type (e.g. "company", "product", "person") */
  type: string;
  /** Arbitrary properties as key-value pairs */
  properties?: Record<string, unknown>;
  /** ISO 8601 timestamp of entity creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last update */
  updatedAt?: string;
}

/**
 * Paginated list of entities.
 */
export interface EntityListResponse {
  /** Array of entity records */
  entities: Entity[];
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items per page */
  limit: number;
  /** Total number of matching entities */
  total: number;
}

/**
 * Parameters for searching entities.
 */
export interface EntitySearchParams {
  /** Search query text */
  query: string;
  /** Filter by entity type */
  type?: string;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Response containing an entity relationship graph.
 */
export interface EntityGraphResponse {
  /** Graph nodes (entities) */
  nodes: Array<{ id: string; name: string; type: string }>;
  /** Graph edges (relationships between entities) */
  edges: Array<{ source: string; target: string; relationship: string }>;
}

// ── Orgs ────────────────────────────────────────────────

/**
 * An organization in the ConvoMem platform.
 *
 * Organizations are the top-level tenant boundary. All customers, memories,
 * conversations, and API keys are scoped to an organization.
 */
export interface Org {
  /** Unique organization identifier */
  id: string;
  /** Organization display name */
  name: string;
  /** Subscription plan (e.g. "free", "pro", "enterprise") */
  plan?: string;
  /** ISO 8601 timestamp of organization creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last update */
  updatedAt?: string;
}

/**
 * Request payload for creating a new organization.
 */
export interface OrgCreateRequest {
  /** Organization display name */
  name: string;
  /** Subscription plan */
  plan?: string;
}

/**
 * Request payload for updating an organization.
 */
export interface OrgUpdateRequest {
  /** Organization display name */
  name?: string;
  /** Subscription plan */
  plan?: string;
}

/**
 * A member of an organization.
 */
export interface OrgMember {
  /** User identifier */
  uid: string;
  /** Member role within the organization */
  role: "owner" | "admin" | "member" | "viewer";
  /** ISO 8601 timestamp of when the member joined */
  joinedAt?: string;
}

/**
 * Request payload for adding a member to an organization.
 */
export interface OrgMemberAddRequest {
  /** User identifier to add */
  uid: string;
  /** Role to assign */
  role: "owner" | "admin" | "member" | "viewer";
}

/**
 * Request payload for updating a member's role.
 */
export interface OrgMemberUpdateRequest {
  /** New role to assign */
  role: "owner" | "admin" | "member" | "viewer";
}

/**
 * An API key belonging to an organization.
 */
export interface OrgApiKey {
  /** Unique API key identifier */
  id: string;
  /** Human-readable key name */
  name?: string;
  /** The API key value (only shown on creation) */
  key?: string;
  /** Key prefix for identification (e.g. "sk-org-abc...") */
  prefix?: string;
  /** ISO 8601 timestamp of key creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last usage, or null if never used */
  lastUsedAt?: string | null;
}

/**
 * Request payload for creating a new organization API key.
 */
export interface OrgApiKeyCreateRequest {
  /** Human-readable key name */
  name?: string;
}

/**
 * An audit log entry for organization activity.
 */
export interface OrgAuditLog {
  /** Unique audit log entry identifier */
  id: string;
  /** Action performed (e.g. "member.added", "key.created") */
  action: string;
  /** Actor who performed the action */
  actor?: string;
  /** Target of the action */
  target?: string;
  /** Additional details as key-value pairs */
  details?: Record<string, unknown>;
  /** ISO 8601 timestamp of the action */
  createdAt?: string;
}

// ── Insights ────────────────────────────────────────────

/**
 * Aggregated dashboard statistics for an organization.
 */
export interface InsightsDashboard {
  /** Total number of customers */
  totalCustomers?: number;
  /** Total number of memories */
  totalMemories?: number;
  /** Total number of conversations */
  totalConversations?: number;
  /** Number of currently active conversations */
  activeConversations?: number;
  /** Average sentiment score across all customers */
  avgSentiment?: number;
  /** Additional dashboard metrics */
  [key: string]: unknown;
}

/**
 * A detected buying signal from customer conversations.
 */
export interface BuyingSignal {
  /** Unique signal identifier */
  id: string;
  /** Customer UUID associated with this signal */
  customerId?: string;
  /** Description of the detected buying signal */
  signal: string;
  /** Confidence score (0.0 to 1.0) */
  confidence?: number;
  /** ISO 8601 timestamp of when the signal was detected */
  detectedAt?: string;
  /** Additional signal metadata */
  [key: string]: unknown;
}

/**
 * A single data point in a sentiment time series.
 */
export interface SentimentPoint {
  /** ISO 8601 timestamp of the data point */
  timestamp: string;
  /** Sentiment score (-1.0 to 1.0) */
  score: number;
  /** Number of conversations contributing to this data point */
  count?: number;
}

/**
 * A customer complaint record.
 */
export interface Complaint {
  /** Unique complaint identifier */
  id: string;
  /** Customer UUID associated with this complaint */
  customerId?: string;
  /** Complaint content text */
  content: string;
  /** Complaint category */
  category?: string;
  /** Severity level */
  severity?: string;
  /** Complaint status */
  status?: string;
  /** ISO 8601 timestamp of complaint creation */
  createdAt?: string;
  /** Additional complaint metadata */
  [key: string]: unknown;
}

/**
 * A frequently occurring issue across conversations.
 */
export interface FrequentIssue {
  /** Description of the issue */
  issue: string;
  /** Number of occurrences */
  count: number;
  /** Percentage of total conversations affected */
  percentage?: number;
}

/**
 * A memory that was actively used during a conversation.
 */
export interface MemoryInAction {
  /** Memory identifier */
  id: string;
  /** Memory fact text */
  fact: string;
  /** Conversation where this memory was used */
  usedInConversation?: string;
  /** Description of the memory's impact */
  impact?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Channel distribution breakdown.
 */
export interface ChannelBreakdown {
  /** Channel name */
  channel: string;
  /** Number of conversations on this channel */
  count: number;
  /** Percentage of total conversations */
  percentage?: number;
}

/**
 * Sales pipeline statistics.
 */
export interface PipelineStats {
  /** Total number of leads */
  totalLeads?: number;
  /** Number of qualified leads */
  qualifiedLeads?: number;
  /** Conversion rate (0.0 to 1.0) */
  conversionRate?: number;
  /** Additional pipeline metrics */
  [key: string]: unknown;
}

/**
 * A generated insight record.
 */
export interface Insight {
  /** Unique insight identifier */
  id: string;
  /** Insight type (e.g. "trend", "anomaly", "recommendation") */
  type: string;
  /** Short title for the insight */
  title?: string;
  /** Detailed summary of the insight */
  summary?: string;
  /** Structured data payload for the insight */
  data?: Record<string, unknown>;
  /** ISO 8601 timestamp of insight creation */
  createdAt?: string;
  /** Additional insight metadata */
  [key: string]: unknown;
}

/**
 * Paginated list of insights.
 */
export interface InsightListResponse {
  /** Array of insight records */
  insights: Insight[];
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items per page */
  limit: number;
  /** Total number of matching insights */
  total: number;
}

/**
 * Request payload for performing an action on an insight.
 */
export interface InsightActionRequest {
  /** Action to perform (e.g. "dismiss", "archive", "share") */
  action: string;
  /** Optional notes about the action */
  notes?: string;
}

// ── Webhooks ────────────────────────────────────────────

/**
 * A webhook subscription for receiving real-time event notifications.
 */
export interface Webhook {
  /** Unique webhook identifier */
  id: string;
  /** Organization ID this webhook belongs to */
  orgId?: string;
  /** URL to receive webhook payloads */
  url: string;
  /** Event types to subscribe to (e.g. ["conversation.created", "memory.ingested"]) */
  events?: string[];
  /** HMAC secret for payload signature verification */
  secret?: string;
  /** Whether this webhook is active */
  active?: boolean;
  /** ISO 8601 timestamp of webhook creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last update */
  updatedAt?: string;
}

/**
 * Request payload for creating a new webhook.
 */
export interface WebhookCreateRequest {
  /** URL to receive webhook payloads */
  url: string;
  /** Event types to subscribe to */
  events?: string[];
  /** HMAC secret for payload signature verification */
  secret?: string;
}

/**
 * Request payload for updating an existing webhook.
 */
export interface WebhookUpdateRequest {
  /** URL to receive webhook payloads */
  url?: string;
  /** Event types to subscribe to */
  events?: string[];
  /** HMAC secret for payload signature verification */
  secret?: string;
  /** Whether this webhook is active */
  active?: boolean;
}
