// ── Config ──────────────────────────────────────────────

export interface ConvoMemConfig {
  /** Organization API key (sk-org-...) */
  apiKey: string;
  /** Override base URL (default: https://api.convomem.com/api/v1) */
  baseUrl?: string;
  /** Custom fetch implementation (for testing or Deno Deploy) */
  fetch?: typeof globalThis.fetch;
  /** Organization ID (for org-scoped operations) */
  orgId?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retries for failed requests (default: 0) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

// ── Capture ─────────────────────────────────────────────

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

export interface CaptureResponse {
  conversationId: string;
  customerId: string;
  status: "new" | "active";
  isNewConversation: boolean;
  isNewCustomer: boolean;
}

// ── Customers ───────────────────────────────────────────

export interface CustomerLookupParams {
  customerId?: string;
  phone?: string;
  email?: string;
  externalId?: string;
  topic?: string;
  autoCreate?: "true" | "false";
  userName?: string;
}

export interface CustomerLookupResponse {
  found: boolean;
  isNewCustomer?: boolean;
  customer: Customer | null;
  memories?: Memory[];
  context?: string;
  tokenCount?: number;
}

export interface CustomerCreateRequest {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  orgId?: string;
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  lastSentiment?: number | null;
  memoryCount?: number;
  conversationCount?: number;
  lastContactAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  page: number;
  limit: number;
  total: number;
}

export interface CustomerUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

// ── Handoff ─────────────────────────────────────────────

export interface HandoffParams {
  customerId?: string;
  phone?: string;
  email?: string;
  externalId?: string;
  narrative?: "true" | "false";
  fresh?: "true" | "false";
}

export interface HandoffResponse {
  found: boolean;
  customer: Customer | null;
  journey: JourneyEntry[];
  keyMemories: KeyMemory[];
  sentimentTrend: {
    direction: "declining" | "improving" | "stable" | "unknown";
    current: number | null;
    points?: Array<{ timestamp: string; score: number }>;
  };
  openIssue: {
    isOpen: boolean;
    reason: "ESCALATED" | "ACTIVE" | "OUTCOME_UNRESOLVED" | null;
    summary: string | null;
  };
  narrative: string | null;
  narrativeSource: "llm" | "fallback" | "skipped";
  generatedAt?: string;
  cached?: boolean;
}

export interface JourneyEntry {
  conversationId?: string;
  channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  status: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
  summary: string | null;
  outcome: string | null;
  sentiment: number | null;
  startedAt?: string;
  endedAt?: string | null;
  messagesCount?: number;
}

export interface KeyMemory {
  id?: string;
  content: string;
  category: string;
  channelSource: string | null;
  memoryType?: string;
  sentiment?: string | null;
}

// ── Memories ────────────────────────────────────────────

export interface Memory {
  id: string;
  content?: string;
  fact?: string;
  category?: string;
  memoryType?: string;
  importance?: number;
  relevance?: number;
  score?: number;
  sentiment?: string | null;
  sourceContext?: string | null;
  topicKey?: string;
  durability?: number;
  confidence?: number;
  confirmationCount?: number;
  isSensitive?: boolean;
  platform?: string;
  searchTags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryIngestRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL";
}

export interface MemoryLookupParams {
  topic: string;
  phone?: string;
  email?: string;
  externalId?: string;
}

export interface MemoryContext {
  context: string;
  tokenCount: number;
  memories: Memory[];
}

export interface MemoryListResponse {
  memories: Memory[];
  page: number;
  limit: number;
  total: number;
}

export interface MemoryUpdateRequest {
  fact?: string;
  category?: string;
  importance?: number;
}

export interface MemoryAddRequest {
  fact: string;
  category?: string;
  importance?: number;
  memoryType?: string;
}

export interface FeedbackLookupRequest {
  customerId?: string;
  phone?: string;
  email?: string;
  externalId?: string;
  topic?: string;
}

export interface FeedbackLookupResponse {
  found: boolean;
  feedback?: Record<string, unknown>;
  memories?: Memory[];
}

// ── Conversations ───────────────────────────────────────

export interface Conversation {
  id: string;
  customerId?: string;
  channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  status: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
  startedAt?: string;
  endedAt?: string | null;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  page: number;
  limit: number;
  total: number;
}

export interface ConversationEndRequest {
  outcome?: string;
}

export interface ConversationEscalateRequest {
  reason?: string;
}

// ── Embed ───────────────────────────────────────────────

export interface EmbedTokenRequest {
  customerId?: string;
  externalId?: string;
  email?: string;
  phone?: string;
  ttlSeconds?: number;
}

export interface EmbedTokenResponse {
  token: string;
  expiresIn: number;
  scope: string;
}

// ── Entities ────────────────────────────────────────────

export interface Entity {
  id: string;
  orgId?: string;
  name: string;
  type: string;
  properties?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface EntityListResponse {
  entities: Entity[];
  page: number;
  limit: number;
  total: number;
}

export interface EntitySearchParams {
  query: string;
  type?: string;
  limit?: number;
}

export interface EntityGraphResponse {
  nodes: Array<{ id: string; name: string; type: string }>;
  edges: Array<{ source: string; target: string; relationship: string }>;
}

// ── Orgs ────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  plan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrgCreateRequest {
  name: string;
  plan?: string;
}

export interface OrgUpdateRequest {
  name?: string;
  plan?: string;
}

export interface OrgMember {
  uid: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt?: string;
}

export interface OrgMemberAddRequest {
  uid: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface OrgMemberUpdateRequest {
  role: "owner" | "admin" | "member" | "viewer";
}

export interface OrgApiKey {
  id: string;
  name?: string;
  key?: string;
  prefix?: string;
  createdAt?: string;
  lastUsedAt?: string | null;
}

export interface OrgApiKeyCreateRequest {
  name?: string;
}

export interface OrgAuditLog {
  id: string;
  action: string;
  actor?: string;
  target?: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

// ── Insights ────────────────────────────────────────────

export interface InsightsDashboard {
  totalCustomers?: number;
  totalMemories?: number;
  totalConversations?: number;
  activeConversations?: number;
  avgSentiment?: number;
  [key: string]: unknown;
}

export interface BuyingSignal {
  id: string;
  customerId?: string;
  signal: string;
  confidence?: number;
  detectedAt?: string;
  [key: string]: unknown;
}

export interface SentimentPoint {
  timestamp: string;
  score: number;
  count?: number;
}

export interface Complaint {
  id: string;
  customerId?: string;
  content: string;
  category?: string;
  severity?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface FrequentIssue {
  issue: string;
  count: number;
  percentage?: number;
}

export interface MemoryInAction {
  id: string;
  fact: string;
  usedInConversation?: string;
  impact?: string;
  [key: string]: unknown;
}

export interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage?: number;
}

export interface PipelineStats {
  totalLeads?: number;
  qualifiedLeads?: number;
  conversionRate?: number;
  [key: string]: unknown;
}

export interface Insight {
  id: string;
  type: string;
  title?: string;
  summary?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}

export interface InsightListResponse {
  insights: Insight[];
  page: number;
  limit: number;
  total: number;
}

export interface InsightActionRequest {
  action: string;
  notes?: string;
}

// ── Webhooks ────────────────────────────────────────────

export interface Webhook {
  id: string;
  orgId?: string;
  url: string;
  events?: string[];
  secret?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookCreateRequest {
  url: string;
  events?: string[];
  secret?: string;
}

export interface WebhookUpdateRequest {
  url?: string;
  events?: string[];
  secret?: string;
  active?: boolean;
}
